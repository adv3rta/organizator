from __future__ import annotations

import logging
from typing import Callable

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QMessageBox,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from app.core.error_codes import ErrorCodes
from app.core.exceptions import AppError
from app.models import PasswordEntry
from app.services.clipboard_service import ClipboardService
from app.services.password_generator_service import PasswordGeneratorService
from app.services.password_storage_service import PasswordStorageService
from app.ui.widgets import LabeledToggle, RetroButton, RetroInput, RetroTextEdit, SliderWithInput

logger = logging.getLogger(__name__)


class PasswordManagerWidget(QWidget):
    """Retro-styled password manager module."""

    def __init__(
        self,
        storage_service: PasswordStorageService,
        generator_service: PasswordGeneratorService,
        clipboard_service: ClipboardService,
        translate: Callable[[str], str],
        notify: Callable[[str, str], None],
    ) -> None:
        super().__init__()
        self._storage_service = storage_service
        self._generator_service = generator_service
        self._clipboard_service = clipboard_service
        self._tr = translate
        self._notify = notify
        self._entries: list[PasswordEntry] = []
        self._current_entry_id: str | None = None
        self._build_ui()
        self.reload_entries()

    def _build_ui(self) -> None:
        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(10)

        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(8)
        search_row = QHBoxLayout()
        self.search_input = RetroInput(placeholder="service / username")
        self.search_input.textChanged.connect(self._render_table)
        self.new_button = RetroButton(self._tr("password.new"), accent=True)
        self.new_button.clicked.connect(self._clear_form)
        search_row.addWidget(QLabel(self._tr("password.search")))
        search_row.addWidget(self.search_input, 1)
        search_row.addWidget(self.new_button)
        left_layout.addLayout(search_row)

        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(
            [
                self._tr("password.service"),
                self._tr("password.username"),
                self._tr("password.password"),
                self._tr("password.url"),
                self._tr("password.notes"),
                self._tr("password.actions"),
            ]
        )
        self.table.verticalHeader().setVisible(False)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.itemSelectionChanged.connect(self._load_selected_entry)
        self.table.horizontalHeader().setStretchLastSection(True)
        left_layout.addWidget(self.table, 1)

        right = QWidget()
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(8)

        form_widget = QWidget()
        form = QFormLayout(form_widget)
        form.setContentsMargins(0, 0, 0, 0)
        self.service_input = RetroInput()
        self.username_input = RetroInput()
        self.password_input = RetroInput()
        self.url_input = RetroInput()
        self.notes_input = RetroTextEdit()
        self.notes_input.setMinimumHeight(96)
        form.addRow(self._tr("password.service"), self.service_input)
        form.addRow(self._tr("password.username"), self.username_input)
        form.addRow(self._tr("password.password"), self.password_input)
        form.addRow(self._tr("password.url"), self.url_input)
        form.addRow(self._tr("password.notes"), self.notes_input)
        right_layout.addWidget(form_widget)

        form_actions = QHBoxLayout()
        self.generate_button = RetroButton(self._tr("password.generate"))
        self.save_button = RetroButton(self._tr("password.save"), accent=True)
        self.delete_button = RetroButton(self._tr("password.delete"))
        self.copy_user_button = RetroButton(self._tr("password.copy_user"))
        self.copy_pass_button = RetroButton(self._tr("password.copy_pass"))
        self.generate_button.clicked.connect(self._toggle_generator)
        self.save_button.clicked.connect(self._save_entry)
        self.delete_button.clicked.connect(self._delete_current_entry)
        self.copy_user_button.clicked.connect(lambda: self._copy_field(self.username_input.text(), "username"))
        self.copy_pass_button.clicked.connect(lambda: self._copy_field(self.password_input.text(), "password"))
        for button in (self.generate_button, self.save_button, self.delete_button, self.copy_user_button, self.copy_pass_button):
            form_actions.addWidget(button)
        form_actions.addStretch()
        right_layout.addLayout(form_actions)

        self.generator_panel = QWidget()
        generator_layout = QFormLayout(self.generator_panel)
        generator_layout.setContentsMargins(0, 0, 0, 0)
        self.generator_length = SliderWithInput(8, 64, 16)
        self.lowercase_toggle = LabeledToggle(self._tr("password.lowercase"), True)
        self.uppercase_toggle = LabeledToggle(self._tr("password.uppercase"), True)
        self.digits_toggle = LabeledToggle(self._tr("password.digits"), True)
        self.symbols_toggle = LabeledToggle(self._tr("password.symbols"), False)
        self.exclude_ambiguous_toggle = LabeledToggle(self._tr("password.exclude_ambiguous"), True)
        self.generated_password = RetroInput()
        self.generated_password.setReadOnly(True)
        generate_row = QHBoxLayout()
        self.generate_now_button = RetroButton(self._tr("password.generate_now"), accent=True)
        self.apply_generated_button = RetroButton(self._tr("password.apply"))
        self.copy_generated_button = RetroButton(self._tr("password.copy"))
        self.generate_now_button.clicked.connect(self._generate_password)
        self.apply_generated_button.clicked.connect(self._apply_generated_password)
        self.copy_generated_button.clicked.connect(lambda: self._copy_field(self.generated_password.text(), "generated_password"))
        generate_row.addWidget(self.generate_now_button)
        generate_row.addWidget(self.apply_generated_button)
        generate_row.addWidget(self.copy_generated_button)
        generator_layout.addRow(self._tr("password.length"), self.generator_length)
        generator_layout.addRow("", self.lowercase_toggle)
        generator_layout.addRow("", self.uppercase_toggle)
        generator_layout.addRow("", self.digits_toggle)
        generator_layout.addRow("", self.symbols_toggle)
        generator_layout.addRow("", self.exclude_ambiguous_toggle)
        generator_layout.addRow(self._tr("password.generated"), self.generated_password)
        generator_layout.addRow("", generate_row)
        self.generator_panel.hide()
        right_layout.addWidget(self.generator_panel)
        right_layout.addStretch()

        root.addWidget(left, 3)
        root.addWidget(right, 2)

    def reload_entries(self) -> None:
        try:
            self._entries = self._storage_service.load_entries()
            self._render_table()
        except AppError as exc:
            self._show_error(exc)

    def retranslate(self, translate: Callable[[str], str]) -> None:
        self._tr = translate
        self.table.setHorizontalHeaderLabels(
            [
                self._tr("password.service"),
                self._tr("password.username"),
                self._tr("password.password"),
                self._tr("password.url"),
                self._tr("password.notes"),
                self._tr("password.actions"),
            ]
        )
        self.new_button.setText(self._tr("password.new"))
        self.generate_button.setText(self._tr("password.generate"))
        self.save_button.setText(self._tr("password.save"))
        self.delete_button.setText(self._tr("password.delete"))
        self.copy_user_button.setText(self._tr("password.copy_user"))
        self.copy_pass_button.setText(self._tr("password.copy_pass"))
        self.lowercase_toggle.toggle.setText(self._tr("password.lowercase"))
        self.uppercase_toggle.toggle.setText(self._tr("password.uppercase"))
        self.digits_toggle.toggle.setText(self._tr("password.digits"))
        self.symbols_toggle.toggle.setText(self._tr("password.symbols"))
        self.exclude_ambiguous_toggle.toggle.setText(self._tr("password.exclude_ambiguous"))
        self.generate_now_button.setText(self._tr("password.generate_now"))
        self.apply_generated_button.setText(self._tr("password.apply"))
        self.copy_generated_button.setText(self._tr("password.copy"))
        self._render_table()

    def _render_table(self) -> None:
        term = self.search_input.text().strip().lower() if hasattr(self, "search_input") else ""
        filtered = [
            entry
            for entry in self._entries
            if term in entry.service_name.lower() or term in entry.username.lower()
        ]
        self.table.setRowCount(len(filtered))
        for row, entry in enumerate(filtered):
            self.table.setItem(row, 0, QTableWidgetItem(entry.service_name))
            self.table.setItem(row, 1, QTableWidgetItem(entry.username))
            self.table.setItem(row, 2, QTableWidgetItem("*" * max(8, len(entry.password))))
            self.table.setItem(row, 3, QTableWidgetItem(entry.url))
            self.table.setItem(row, 4, QTableWidgetItem(entry.notes))
            actions = QWidget()
            actions_layout = QHBoxLayout(actions)
            actions_layout.setContentsMargins(0, 0, 0, 0)
            actions_layout.setSpacing(4)
            edit_button = RetroButton(self._tr("password.edit"))
            delete_button = RetroButton(self._tr("password.delete"))
            copy_user_button = RetroButton(self._tr("password.copy_user"))
            copy_pass_button = RetroButton(self._tr("password.copy_pass"))
            edit_button.clicked.connect(lambda _=False, value=entry.entry_id: self._select_entry(value))
            delete_button.clicked.connect(lambda _=False, value=entry.entry_id: self._delete_entry(value))
            copy_user_button.clicked.connect(lambda _=False, value=entry.username: self._copy_field(value, "username"))
            copy_pass_button.clicked.connect(lambda _=False, value=entry.password: self._copy_field(value, "password"))
            actions_layout.addWidget(edit_button)
            actions_layout.addWidget(delete_button)
            actions_layout.addWidget(copy_user_button)
            actions_layout.addWidget(copy_pass_button)
            actions_layout.addStretch()
            self.table.setCellWidget(row, 5, actions)
            self.table.item(row, 0).setData(Qt.UserRole, entry.entry_id)
        self.table.resizeColumnsToContents()

    def _toggle_generator(self) -> None:
        self.generator_panel.setVisible(not self.generator_panel.isVisible())

    def _generate_password(self) -> None:
        try:
            generated = self._generator_service.generate(
                self.generator_length.value(),
                self.lowercase_toggle.toggle.isChecked(),
                self.uppercase_toggle.toggle.isChecked(),
                self.digits_toggle.toggle.isChecked(),
                self.symbols_toggle.toggle.isChecked(),
                self.exclude_ambiguous_toggle.toggle.isChecked(),
            )
            self.generated_password.setText(generated)
        except AppError as exc:
            self._show_error(exc)

    def _apply_generated_password(self) -> None:
        self.password_input.setText(self.generated_password.text())

    def _save_entry(self) -> None:
        try:
            if self._current_entry_id is None:
                entry = self._storage_service.create_entry(
                    self.service_input.text(),
                    self.username_input.text(),
                    self.password_input.text(),
                    self.url_input.text(),
                    self.notes_input.toPlainText(),
                )
                self._entries.append(entry)
            else:
                entry = next(item for item in self._entries if item.entry_id == self._current_entry_id)
                self._storage_service.update_entry(
                    entry,
                    self.service_input.text(),
                    self.username_input.text(),
                    self.password_input.text(),
                    self.url_input.text(),
                    self.notes_input.toPlainText(),
                )
            self._storage_service.save_entries(self._entries)
            self._render_table()
            self._notify("success", self._tr("password.saved_notice"))
            logger.info("Password entry saved", extra={"error_code": ErrorCodes.UI_ACTION, "context": {"entry_id": entry.entry_id}})
            self._clear_form()
        except StopIteration:
            self._show_error(AppError("Entry not found.", code=ErrorCodes.PASSWORD_LOAD))
        except AppError as exc:
            self._show_error(exc)

    def _delete_current_entry(self) -> None:
        if self._current_entry_id is None:
            return
        self._delete_entry(self._current_entry_id)

    def _delete_entry(self, entry_id: str) -> None:
        self._entries = [entry for entry in self._entries if entry.entry_id != entry_id]
        try:
            self._storage_service.save_entries(self._entries)
            self._render_table()
            self._clear_form()
            self._notify("info", self._tr("password.deleted_notice"))
        except AppError as exc:
            self._show_error(exc)

    def _load_selected_entry(self) -> None:
        current_row = self.table.currentRow()
        if current_row < 0:
            return
        item = self.table.item(current_row, 0)
        if item is None:
            return
        entry_id = item.data(Qt.UserRole)
        if isinstance(entry_id, str):
            self._select_entry(entry_id)

    def _select_entry(self, entry_id: str) -> None:
        for entry in self._entries:
            if entry.entry_id != entry_id:
                continue
            self._current_entry_id = entry.entry_id
            self.service_input.setText(entry.service_name)
            self.username_input.setText(entry.username)
            self.password_input.setText(entry.password)
            self.url_input.setText(entry.url)
            self.notes_input.setPlainText(entry.notes)
            return

    def _copy_field(self, text: str, label: str) -> None:
        if not text:
            return
        self._clipboard_service.copy_text(text, label)
        self._notify("info", self._tr("password.copied_notice"))

    def _clear_form(self) -> None:
        self._current_entry_id = None
        self.service_input.clear()
        self.username_input.clear()
        self.password_input.clear()
        self.url_input.clear()
        self.notes_input.clear()

    def _show_error(self, exc: AppError) -> None:
        logger.error("Password manager error", extra={"error_code": exc.code, "context": {"message": exc.message}})
        QMessageBox.critical(self, self._tr("password.error_title"), str(exc))
