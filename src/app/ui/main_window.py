from __future__ import annotations

import logging
from pathlib import Path

from PySide6.QtCore import QEasingCurve, QPropertyAnimation, QRect, Qt, QUrl
from PySide6.QtGui import QAction, QDesktopServices, QGuiApplication, QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QFileDialog,
    QFormLayout,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMenu,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from app.core.exceptions import AppError
from app.models import AppSettings, MetadataUpdate, WatermarkPreset, WatermarkRequest
from app.services.clipboard_service import ClipboardService
from app.services.coder_service import CoderService
from app.services.image_service import ImageService
from app.services.metadata_service import MetadataService
from app.services.notification_service import notification_bus, show_notification
from app.services.password_generator_service import PasswordGeneratorService
from app.services.password_storage_service import PasswordStorageService
from app.services.preset_service import PresetService
from app.services.settings_service import SettingsService
from app.services.watermark_service import WatermarkService
from app.ui.password_manager import PasswordManagerWidget
from app.ui.theme import build_stylesheet
from app.ui.widgets import DesktopIconButton, FileQueueWidget, LabeledToggle, RetroButton, RetroInput, RetroTextEdit, RetroWindow, SliderWithInput, TaskRunner, ToastManager

logger = logging.getLogger(__name__)
APP_NAME = "organizator"
LOGO_PATH = Path("assets/logo.png")
TRANSLATIONS = {
    "en": {
        "start": "Start",
        "file": "File",
        "view": "View",
        "special": "Special",
        "telegram": "Telegram",
        "settings": "Settings",
        "password_manager": "Password Manager",
        "made_by": "made by adv3rta",
        "view_assets": "View assets",
        "method": "Method",
        "input": "Input",
        "output": "Output",
        "shift": "Shift",
        "add_images": "Add images",
        "add_files": "Add files",
        "add_mp3": "Add MP3 files",
        "delete_selected": "Delete selected",
        "slice_images": "Slice images",
        "apply_watermark": "Apply watermark",
        "select_png": "Select PNG",
        "png_not_selected": "PNG not selected",
        "cover_not_selected": "Cover not selected",
        "select_cover": "Select cover",
        "apply_preset": "Apply preset",
        "save_preset": "Save preset",
        "delete_preset": "Delete preset",
        "text": "Text",
        "png": "PNG",
        "preset": "Preset",
        "title": "Title",
        "author": "Author",
        "tags": "Tags",
        "cover": "Cover",
        "export_tagged": "Export tagged copies",
        "sound": "Sound",
        "notifications": "Notifications",
        "toast_corner": "Toast corner",
        "export_folder": "Export folder",
        "choose_export_folder": "Choose export folder",
        "save_settings": "Save settings",
        "language": "Language",
        "coder": "coder",
        "image_splitter": "Image Splitter",
        "watermark": "Watermark",
        "mp3_metadata": "MP3 Metadata",
        "password.search": "Search",
        "password.service": "Service",
        "password.username": "Username",
        "password.password": "Password",
        "password.url": "URL",
        "password.notes": "Notes",
        "password.actions": "Actions",
        "password.new": "New",
        "password.generate": "Generate password",
        "password.save": "Save entry",
        "password.delete": "Delete entry",
        "password.copy_user": "Copy user",
        "password.copy_pass": "Copy pass",
        "password.lowercase": "Lowercase",
        "password.uppercase": "Uppercase",
        "password.digits": "Digits",
        "password.symbols": "Symbols",
        "password.exclude_ambiguous": "Exclude ambiguous",
        "password.generate_now": "Generate",
        "password.apply": "Apply",
        "password.copy": "Copy",
        "password.length": "Length",
        "password.generated": "Generated",
        "password.saved_notice": "Password entry saved.",
        "password.deleted_notice": "Password entry deleted.",
        "password.copied_notice": "Copied to clipboard.",
        "password.error_title": "Password manager error",
        "password.edit": "Edit",
    },
    "ru": {
        "start": "Приступить",
        "file": "Файл",
        "view": "Вид",
        "special": "Специальное",
        "telegram": "Телеграм",
        "settings": "Настройки",
        "password_manager": "Менеджер паролей",
        "made_by": "made by adv3rta",
        "view_assets": "посмотреть ассеты",
        "method": "Метод",
        "input": "Ввод",
        "output": "Вывод",
        "shift": "Сдвиг",
        "add_images": "Добавить изображения",
        "add_files": "Добавить файлы",
        "add_mp3": "Добавить MP3",
        "delete_selected": "Удалить выбранное",
        "slice_images": "Разрезать изображения",
        "apply_watermark": "Наложить водяной знак",
        "select_png": "Выбрать PNG",
        "png_not_selected": "PNG не выбран",
        "cover_not_selected": "Обложка не выбрана",
        "select_cover": "Выбрать обложку",
        "apply_preset": "Применить пресет",
        "save_preset": "Сохранить пресет",
        "delete_preset": "Удалить пресет",
        "text": "Текст",
        "png": "PNG",
        "preset": "Пресет",
        "title": "Название",
        "author": "Автор",
        "tags": "Теги",
        "cover": "Обложка",
        "export_tagged": "Экспорт копий",
        "sound": "Звук",
        "notifications": "Уведомления",
        "toast_corner": "Угол уведомлений",
        "export_folder": "Папка экспорта",
        "choose_export_folder": "Выбрать папку экспорта",
        "save_settings": "Сохранить настройки",
        "language": "Язык",
        "coder": "кодер",
        "image_splitter": "Разделитель изображений",
        "watermark": "Водяной знак",
        "mp3_metadata": "MP3 метаданные",
        "password.search": "Поиск",
        "password.service": "Сервис",
        "password.username": "Логин",
        "password.password": "Пароль",
        "password.url": "URL",
        "password.notes": "Заметки",
        "password.actions": "Действия",
        "password.new": "Новая",
        "password.generate": "Сгенерировать пароль",
        "password.save": "Сохранить запись",
        "password.delete": "Удалить запись",
        "password.copy_user": "Коп. логин",
        "password.copy_pass": "Коп. пароль",
        "password.lowercase": "Строчные",
        "password.uppercase": "Заглавные",
        "password.digits": "Цифры",
        "password.symbols": "Символы",
        "password.exclude_ambiguous": "Исключить неоднозначные",
        "password.generate_now": "Сгенерировать",
        "password.apply": "Применить",
        "password.copy": "Копировать",
        "password.length": "Длина",
        "password.generated": "Готовый",
        "password.saved_notice": "Запись пароля сохранена.",
        "password.deleted_notice": "Запись пароля удалена.",
        "password.copied_notice": "Скопировано в буфер.",
        "password.error_title": "Ошибка менеджера паролей",
        "password.edit": "Изменить",
    },
}


class LogoLabel(QLabel):
    def __init__(self, max_height: int, fallback_size: int = 24) -> None:
        super().__init__()
        self._max_height = max_height
        self._fallback_size = fallback_size
        self.setAlignment(Qt.AlignCenter)
        self._refresh()

    def resizeEvent(self, event) -> None:  # noqa: N802
        self._refresh()
        super().resizeEvent(event)

    def _refresh(self) -> None:
        if LOGO_PATH.exists():
            pixmap = QPixmap(str(LOGO_PATH))
            if not pixmap.isNull():
                self.setPixmap(pixmap.scaled(max(80, self.width()), self._max_height, Qt.KeepAspectRatio, Qt.FastTransformation))
                self.setText("")
                return
        self.setPixmap(QPixmap())
        self.setText(APP_NAME)
        self.setStyleSheet(f"font-weight:bold; font-size:{self._fallback_size}px;")


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle(APP_NAME)
        self.resize(1360, 900)
        self.task_runner = TaskRunner()
        self.image_service = ImageService()
        self.watermark_service = WatermarkService()
        self.metadata_service = MetadataService()
        self.coder_service = CoderService()
        self.password_storage_service = PasswordStorageService()
        self.password_generator_service = PasswordGeneratorService()
        self.clipboard_service = ClipboardService()
        self.preset_service = PresetService()
        self.settings_service = SettingsService()
        self.settings = self.settings_service.load()
        self.presets = self.preset_service.load_presets()
        self._module_indices: dict[str, int] = {}
        self._last_trigger_widget: QWidget | None = None

        self._build_ui()
        self._apply_theme()
        self._refresh_presets()
        self._sync_settings()
        self._update_coder_method()
        notification_bus.notify.connect(self._show_toast)

    def _tr(self, key: str) -> str:
        return TRANSLATIONS.get(self.settings.language, TRANSLATIONS["en"]).get(key, key)

    def _build_ui(self) -> None:
        root = QWidget()
        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        self.root_stack = QStackedWidget()
        self.root_stack.addWidget(self._build_launch_screen())
        self.root_stack.addWidget(self._build_desktop_screen())
        root_layout.addWidget(self.root_stack)
        self.setCentralWidget(root)
        self.toast_manager = ToastManager(root)
        self.toast_manager.set_corner(self.settings.notification_corner)
        self.statusBar().hide()

    def _build_launch_screen(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.addStretch()
        panel = QWidget()
        panel.setMaximumWidth(820)
        panel_layout = QVBoxLayout(panel)
        panel_layout.setContentsMargins(18, 18, 18, 18)
        panel_layout.setSpacing(16)
        logo = LogoLabel(360, 32)
        logo.setMinimumHeight(340)
        button = RetroButton("Приступить", accent=True)
        button = RetroButton("\u041f\u0440\u0438\u0441\u0442\u0443\u043f\u0438\u0442\u044c", accent=True)
        button = RetroButton(self._tr("start"), accent=True)
        button.setMinimumSize(220, 42)
        button.clicked.connect(lambda: self.root_stack.setCurrentIndex(1))
        panel_layout.addWidget(logo)
        panel_layout.addWidget(button, 0, Qt.AlignCenter)
        layout.addWidget(panel, 0, Qt.AlignCenter)
        layout.addStretch()
        return page

    def _build_desktop_screen(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(0)
        layout.addWidget(self._build_top_bar())
        self.desktop_surface = QFrame()
        self.desktop_surface.setObjectName("desktopSurface")
        desktop_layout = QVBoxLayout(self.desktop_surface)
        desktop_layout.setContentsMargins(18, 18, 18, 18)
        desktop_layout.addWidget(self._build_icon_grid(), 0, Qt.AlignTop | Qt.AlignLeft)
        desktop_layout.addStretch()
        layout.addWidget(self.desktop_surface, 1)
        self.overlay = QFrame(self.desktop_surface)
        self.overlay.setObjectName("overlayShade")
        self.overlay.hide()
        self.overlay_window = RetroWindow()
        self.overlay_window.setParent(self.overlay)
        self.overlay_window.closeRequested.connect(self._close_module)
        self.module_stack = QStackedWidget()
        self.overlay_window.set_content(self.module_stack)
        self._build_modules()
        return page

    def _build_top_bar(self) -> QWidget:
        bar = QFrame()
        bar.setObjectName("topBar")
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(6, 3, 6, 3)
        layout.setSpacing(6)
        logo = LogoLabel(22, 12)
        logo.setFixedSize(34, 28)
        file_button = RetroButton(self._tr("file"), flat_menu=True)
        view_button = RetroButton(self._tr("view"), flat_menu=True)
        special_button = RetroButton(self._tr("special"), flat_menu=True)
        telegram = RetroButton(self._tr("telegram"), flat_menu=True)
        telegram.clicked.connect(lambda: QDesktopServices.openUrl(QUrl("https://t.me/adv3rta")))
        for button in (file_button, view_button, special_button, telegram):
            button.setFixedSize(112, 30)
        self.settings_button = RetroButton("", flat_menu=True, icon_name="settings")
        self.settings_button.setFixedSize(42, 34)
        self.settings_button.clicked.connect(self._show_settings_menu)
        self.file_menu = QMenu(self)
        self.file_menu.setStyleSheet("QMenu { background: #ffffff; color: #000000; border: 1px solid #000000; } QMenu::item:selected { background: #d9d9d9; color: #000000; }")
        file_info = QAction(self._tr("made_by"), self)
        file_info.setEnabled(False)
        self.file_menu.addAction(file_info)
        file_button.clicked.connect(lambda: self.file_menu.popup(file_button.mapToGlobal(file_button.rect().bottomLeft())))
        self.view_menu = QMenu(self)
        self.view_menu.setStyleSheet("QMenu { background: #ffffff; color: #000000; border: 1px solid #000000; } QMenu::item:selected { background: #d9d9d9; color: #000000; }")
        view_action = QAction(self._tr("view_assets"), self)
        view_action.triggered.connect(self._open_assets_folder)
        self.view_menu.addAction(view_action)
        view_button.clicked.connect(lambda: self.view_menu.popup(view_button.mapToGlobal(view_button.rect().bottomLeft())))
        self.special_menu = QMenu(self)
        self.special_menu.setStyleSheet("QMenu { background: #ffffff; color: #000000; border: 1px solid #000000; } QMenu::item:selected { background: #d9d9d9; color: #000000; }")
        password_action = QAction(self._tr("password_manager"), self)
        password_action.triggered.connect(lambda: self._open_module(self._tr("password_manager")))
        self.special_menu.addAction(password_action)
        special_button.clicked.connect(lambda: self.special_menu.popup(special_button.mapToGlobal(special_button.rect().bottomLeft())))
        layout.addWidget(logo)
        layout.addWidget(file_button)
        layout.addWidget(view_button)
        layout.addWidget(special_button)
        layout.addWidget(telegram)
        layout.addStretch()
        layout.addWidget(self.settings_button)
        self.settings_menu = QMenu(self)
        self.settings_menu.setStyleSheet("QMenu { background: #ffffff; color: #000000; border: 1px solid #000000; } QMenu::item:selected { background: #d9d9d9; color: #000000; }")
        action = QAction(self._tr("settings"), self)
        action.triggered.connect(lambda: self._open_module(self._tr("settings")))
        self.settings_menu.addAction(action)
        return bar

    def _build_icon_grid(self) -> QWidget:
        holder = QWidget()
        grid = QGridLayout(holder)
        grid.setContentsMargins(4, 18, 4, 4)
        grid.setHorizontalSpacing(36)
        grid.setVerticalSpacing(28)
        entries = [
            ("slicer", "slicer", self._tr("image_splitter")),
            ("watermarker", "watermarker", self._tr("watermark")),
            ("coder", "coder", self._tr("coder")),
            ("metadater", "metadater", self._tr("mp3_metadata")),
        ]
        self.desktop_icons: dict[str, DesktopIconButton] = {}
        for index, (label, icon_key, module_title) in enumerate(entries):
            button = DesktopIconButton(label, icon_key)
            button.clicked.connect(lambda value=module_title, source=button: self._open_module(value, source))
            self.desktop_icons[label] = button
            grid.addWidget(button, index // 4, index % 4, Qt.AlignTop | Qt.AlignLeft)
        return holder

    def _build_modules(self) -> None:
        pages = [
            (self._tr("coder"), self._build_coder()),
            (self._tr("image_splitter"), self._build_slicer()),
            (self._tr("watermark"), self._build_watermark()),
            (self._tr("mp3_metadata"), self._build_metadata()),
            (self._tr("password_manager"), self._build_password_manager()),
            (self._tr("settings"), self._build_settings()),
        ]
        for title, widget in pages:
            self._module_indices[title] = self.module_stack.addWidget(widget)

    def _panel(self) -> QFrame:
        panel = QFrame()
        panel.setObjectName("retroPanel")
        return panel

    def _build_coder(self) -> QWidget:
        page = QWidget()
        layout = QHBoxLayout(page)
        layout.setSpacing(10)
        left = self._panel()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(8, 8, 8, 8)
        left_layout.addWidget(QLabel(self._tr("method")))
        self._coder_method = "Morse"
        self.coder_method_buttons: dict[str, RetroButton] = {}
        for method in ("Morse", "Binary", "Base64", "Caesar"):
            button = RetroButton(method, accent=method == self._coder_method)
            button.clicked.connect(lambda _=False, value=method: self._set_coder_method(value))
            self.coder_method_buttons[method] = button
            left_layout.addWidget(button)
        left_layout.addStretch()
        center = self._panel()
        center_layout = QVBoxLayout(center)
        center_layout.setContentsMargins(8, 8, 8, 8)
        center_layout.addWidget(QLabel(self._tr("input")))
        self.coder_input = RetroTextEdit("Example: Hello")
        self.coder_input.textChanged.connect(self._update_caesar_preview)
        center_layout.addWidget(self.coder_input)
        center_layout.addWidget(QLabel(self._tr("output")))
        self.coder_output = RetroTextEdit("Output appears here")
        self.coder_output.setReadOnly(True)
        center_layout.addWidget(self.coder_output)
        self.coder_status = QLabel("")
        self.coder_status.setObjectName("muted")
        center_layout.addWidget(self.coder_status)
        right = self._panel()
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(8, 8, 8, 8)
        self.coder_shift_label = QLabel(self._tr("shift"))
        self.coder_shift = SliderWithInput(1, 25, 3)
        self.coder_shift.valueChanged.connect(self._update_caesar_preview)
        encode = RetroButton("Encode", accent=True)
        decode = RetroButton("Decode")
        swap = RetroButton("Swap")
        copy_button = RetroButton("Copy")
        paste_button = RetroButton("Paste")
        clear_button = RetroButton("Clear")
        encode.clicked.connect(lambda: self._run_coder("encode"))
        decode.clicked.connect(lambda: self._run_coder("decode"))
        swap.clicked.connect(self._swap_coder)
        copy_button.clicked.connect(self._copy_coder_output)
        paste_button.clicked.connect(self._paste_coder_input)
        clear_button.clicked.connect(self._clear_coder)
        top_row = QHBoxLayout()
        top_row.addWidget(encode)
        top_row.addWidget(decode)
        right_layout.addLayout(top_row)
        right_layout.addSpacing(14)
        right_layout.addWidget(swap)
        right_layout.addSpacing(14)
        right_layout.addWidget(self.coder_shift_label)
        right_layout.addWidget(self.coder_shift)
        right_layout.addWidget(copy_button)
        right_layout.addWidget(paste_button)
        right_layout.addWidget(clear_button)
        right_layout.addStretch()
        layout.addWidget(left, 1)
        layout.addWidget(center, 3)
        layout.addWidget(right, 1)
        return page

    def _build_slicer(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        row = QHBoxLayout()
        add_button = RetroButton(self._tr("add_images"), accent=True)
        add_button.clicked.connect(self._pick_slicer_files)
        remove_button = RetroButton(self._tr("delete_selected"))
        remove_button.clicked.connect(self._remove_selected_slicer)
        row.addWidget(add_button)
        row.addWidget(remove_button)
        row.addStretch()
        layout.addLayout(row)
        panel = self._panel()
        panel_layout = QVBoxLayout(panel)
        panel_layout.setContentsMargins(8, 8, 8, 8)
        self.slicer_queue = FileQueueWidget("image", show_retry=False)
        self.square_size = SliderWithInput(8, 4096, 256, " px")
        self.slicer_status = QLabel("")
        self.slicer_status.setObjectName("muted")
        run = RetroButton(self._tr("slice_images"), accent=True)
        run.clicked.connect(self._run_slice)
        form = QFormLayout()
        form.addRow("Tile size", self.square_size)
        form.addRow("", self.slicer_status)
        panel_layout.addWidget(self.slicer_queue)
        panel_layout.addLayout(form)
        panel_layout.addWidget(run, 0, Qt.AlignRight)
        layout.addWidget(panel)
        return page

    def _build_watermark(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        row = QHBoxLayout()
        add_button = RetroButton(self._tr("add_files"), accent=True)
        add_button.clicked.connect(self._pick_watermark_files)
        remove_button = RetroButton(self._tr("delete_selected"))
        remove_button.clicked.connect(self._remove_selected_watermark)
        row.addWidget(add_button)
        row.addWidget(remove_button)
        row.addStretch()
        layout.addLayout(row)
        split = QHBoxLayout()
        left = self._panel()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(8, 8, 8, 8)
        self.watermark_queue = FileQueueWidget("image")
        left_layout.addWidget(self.watermark_queue)
        right = self._panel()
        form = QFormLayout(right)
        form.setContentsMargins(8, 8, 8, 8)
        self.wm_text = RetroInput()
        self.wm_text.textChanged.connect(self._validate_watermark)
        self.wm_image_path: Path | None = None
        self.wm_image_label = QLabel(self._tr("png_not_selected"))
        self.wm_image_label.setObjectName("muted")
        pick = RetroButton(self._tr("select_png"))
        pick.clicked.connect(self._pick_watermark_png)
        self.wm_preset = QComboBox()
        self.wm_x = SliderWithInput(0, 100, 75, "%")
        self.wm_y = SliderWithInput(0, 100, 80, "%")
        self.wm_opacity = SliderWithInput(0, 100, 60, "%")
        self.wm_scale = SliderWithInput(5, 100, 20, "%")
        self.wm_rotation = SliderWithInput(-180, 180, 0, " deg")
        self.wm_status = QLabel("")
        self.wm_status.setObjectName("muted")
        apply_preset = RetroButton(self._tr("apply_preset"))
        save_preset = RetroButton(self._tr("save_preset"))
        delete_preset = RetroButton(self._tr("delete_preset"))
        for button in (apply_preset, save_preset, delete_preset):
            button.setFixedHeight(28)
            button.setMinimumWidth(74)
        run = RetroButton(self._tr("apply_watermark"), accent=True)
        apply_preset.clicked.connect(self._apply_preset)
        save_preset.clicked.connect(self._save_preset_prompt)
        delete_preset.clicked.connect(self._delete_preset_current)
        run.clicked.connect(self._run_watermark)
        form.addRow(self._tr("text"), self.wm_text)
        form.addRow(self._tr("png"), self.wm_image_label)
        form.addRow("", pick)
        form.addRow(self._tr("preset"), self.wm_preset)
        preset_row_widget = QWidget()
        preset_row = QHBoxLayout(preset_row_widget)
        preset_row.setContentsMargins(0, 0, 0, 0)
        preset_row.addWidget(apply_preset)
        preset_row.addWidget(save_preset)
        preset_row.addWidget(delete_preset)
        preset_row.addStretch()
        form.addRow("", preset_row_widget)
        form.addRow("X", self.wm_x)
        form.addRow("Y", self.wm_y)
        form.addRow("Opacity", self.wm_opacity)
        form.addRow("Scale", self.wm_scale)
        form.addRow("Rotation", self.wm_rotation)
        form.addRow("", self.wm_status)
        form.addRow("", run)
        split.addWidget(left, 1)
        split.addWidget(right, 1)
        layout.addLayout(split)
        return page

    def _build_metadata(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        row = QHBoxLayout()
        add_button = RetroButton(self._tr("add_mp3"), accent=True)
        add_button.clicked.connect(self._pick_mp3_files)
        remove_button = RetroButton(self._tr("delete_selected"))
        remove_button.clicked.connect(self._remove_selected_mp3)
        row.addWidget(add_button)
        row.addWidget(remove_button)
        row.addStretch()
        layout.addLayout(row)
        split = QHBoxLayout()
        left = self._panel()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(8, 8, 8, 8)
        self.mp3_queue = FileQueueWidget("mp3")
        left_layout.addWidget(self.mp3_queue)
        right = self._panel()
        form = QFormLayout(right)
        form.setContentsMargins(8, 8, 8, 8)
        self.meta_title = RetroInput()
        self.meta_author = RetroInput()
        self.meta_tags = RetroInput()
        self.meta_cover_path: Path | None = None
        self.meta_cover_label = QLabel(self._tr("cover_not_selected"))
        self.meta_cover_label.setObjectName("muted")
        pick = RetroButton(self._tr("select_cover"))
        pick.clicked.connect(self._pick_cover)
        run = RetroButton(self._tr("export_tagged"), accent=True)
        run.clicked.connect(self._run_metadata)
        form.addRow(self._tr("title"), self.meta_title)
        form.addRow(self._tr("author"), self.meta_author)
        form.addRow(self._tr("tags"), self.meta_tags)
        form.addRow(self._tr("cover"), self.meta_cover_label)
        form.addRow("", pick)
        form.addRow("", run)
        split.addWidget(left, 1)
        split.addWidget(right, 1)
        layout.addLayout(split)
        return page

    def _build_settings(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        panel = self._panel()
        form = QFormLayout(panel)
        form.setContentsMargins(8, 8, 8, 8)
        self.sound = LabeledToggle(self._tr("sound"), False)
        self.notifications = LabeledToggle(self._tr("notifications"), True)
        self.toast_corner = QComboBox()
        self.toast_corner.addItems(["bottom-right", "bottom-left", "top-right", "top-left"])
        self.language = QComboBox()
        self.language.addItems(["en", "ru"])
        self.export_dir = RetroInput()
        pick = RetroButton(self._tr("choose_export_folder"))
        save = RetroButton(self._tr("save_settings"), accent=True)
        pick.clicked.connect(self._pick_export_dir)
        save.clicked.connect(self._save_settings)
        form.addRow("", self.sound)
        form.addRow("", self.notifications)
        form.addRow(self._tr("language"), self.language)
        form.addRow(self._tr("toast_corner"), self.toast_corner)
        form.addRow(self._tr("export_folder"), self.export_dir)
        form.addRow("", pick)
        form.addRow("", save)
        layout.addWidget(panel)
        layout.addStretch()
        return page

    def _build_password_manager(self) -> QWidget:
        self.password_manager = PasswordManagerWidget(
            self.password_storage_service,
            self.password_generator_service,
            self.clipboard_service,
            self._tr,
            show_notification,
        )
        return self.password_manager

    def _show_settings_menu(self) -> None:
        self.settings_menu.popup(self.settings_button.mapToGlobal(self.settings_button.rect().bottomLeft()))

    def _open_module(self, title: str, source_widget: QWidget | None = None) -> None:
        if title not in self._module_indices:
            return
        self._last_trigger_widget = source_widget
        self.module_stack.setCurrentIndex(self._module_indices[title])
        self.overlay_window.set_title(title)
        self.overlay.setGeometry(self.desktop_surface.rect())
        self.overlay.show()
        self.overlay.raise_()
        self.overlay_window.raise_()
        start_rect = self._icon_start_rect(source_widget)
        end_rect = self._window_target_rect()
        self.overlay_window.setGeometry(start_rect)
        self.overlay_window.show()
        animation = QPropertyAnimation(self.overlay_window, b"geometry", self)
        animation.setDuration(140)
        animation.setStartValue(start_rect)
        animation.setEndValue(end_rect)
        animation.setEasingCurve(QEasingCurve.Linear)
        animation.start()
        self._window_animation = animation

    def _close_module(self) -> None:
        if not self.overlay.isVisible():
            return
        animation = QPropertyAnimation(self.overlay_window, b"geometry", self)
        animation.setDuration(120)
        animation.setStartValue(self.overlay_window.geometry())
        animation.setEndValue(self._icon_start_rect(self._last_trigger_widget))
        animation.setEasingCurve(QEasingCurve.Linear)
        animation.finished.connect(self._finish_close_module)
        animation.start()
        self._window_animation = animation

    def _finish_close_module(self) -> None:
        self.overlay_window.hide()
        self.overlay.hide()

    def _icon_start_rect(self, widget: QWidget | None) -> QRect:
        if widget is None:
            center = self.overlay.rect().center()
            return QRect(center.x() - 40, center.y() - 30, 80, 60)
        pos = widget.mapTo(self.overlay, widget.rect().topLeft())
        return QRect(pos.x() + 16, pos.y() + 16, max(88, widget.width() - 32), max(68, widget.height() - 40))

    def _window_target_rect(self) -> QRect:
        area = self.overlay.rect().adjusted(70, 42, -70, -42)
        width = min(1040, area.width())
        height = min(720, area.height())
        return QRect(area.center().x() - width // 2, area.center().y() - height // 2, width, height)

    def _apply_theme(self) -> None:
        QApplication.instance().setStyle("Fusion")
        self.setStyleSheet(build_stylesheet(self.settings.theme))

    def resizeEvent(self, event) -> None:  # noqa: N802
        if hasattr(self, "toast_manager"):
            self.toast_manager.resize(self.centralWidget().size())
        if hasattr(self, "overlay") and hasattr(self, "desktop_surface"):
            self.overlay.setGeometry(self.desktop_surface.rect())
            if self.overlay.isVisible():
                self.overlay_window.setGeometry(self._window_target_rect())
        super().resizeEvent(event)

    def _sync_settings(self) -> None:
        self.sound.toggle.setChecked(self.settings.sound_enabled)
        self.notifications.toggle.setChecked(self.settings.notifications_enabled)
        self.toast_corner.setCurrentText(self.settings.notification_corner)
        self.language.setCurrentText(self.settings.language)
        self.export_dir.setText(str(self.settings.export_directory))

    def _save_settings(self) -> None:
        previous_language = self.settings.language
        self.settings = AppSettings(
            theme=self.settings.theme,
            sound_enabled=self.sound.toggle.isChecked(),
            notifications_enabled=self.notifications.toggle.isChecked(),
            export_directory=Path(self.export_dir.text().strip() or self.settings.export_directory),
            notification_corner=self.toast_corner.currentText(),
            language=self.language.currentText(),
        )
        self.settings_service.save(self.settings)
        self.toast_manager.set_corner(self.settings.notification_corner)
        self._apply_theme()
        if previous_language != self.settings.language:
            self._rebuild_ui()
        show_notification("success", "Settings saved.")

    def _rebuild_ui(self) -> None:
        current_root_index = self.root_stack.currentIndex() if hasattr(self, "root_stack") else 0
        try:
            notification_bus.notify.disconnect(self._show_toast)
        except Exception:
            pass
        self._build_ui()
        self._apply_theme()
        self._refresh_presets()
        self._sync_settings()
        self._update_coder_method()
        notification_bus.notify.connect(self._show_toast)
        self.root_stack.setCurrentIndex(current_root_index)

    def _pick_export_dir(self) -> None:
        folder = QFileDialog.getExistingDirectory(self, "Choose export folder", self.export_dir.text())
        if folder:
            self.export_dir.setText(folder)

    def _open_assets_folder(self) -> None:
        assets_dir = Path("assetsadv3rta")
        assets_dir.mkdir(parents=True, exist_ok=True)
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(assets_dir.resolve())))

    def _refresh_presets(self) -> None:
        self.wm_preset.clear()
        self.wm_preset.addItems(sorted(self.presets.keys()))

    def _pick_slicer_files(self) -> None:
        files, _ = QFileDialog.getOpenFileNames(self, "Choose images", filter="Images (*.png *.jpg *.jpeg *.webp *.bmp *.gif *.tif *.tiff)")
        self.slicer_queue.add_paths([Path(value) for value in files])

    def _pick_watermark_files(self) -> None:
        files, _ = QFileDialog.getOpenFileNames(self, "Choose images", filter="Images (*.png *.jpg *.jpeg *.webp *.bmp *.gif *.tif *.tiff)")
        self.watermark_queue.add_paths([Path(value) for value in files])

    def _pick_mp3_files(self) -> None:
        files, _ = QFileDialog.getOpenFileNames(self, "Choose MP3 files", filter="Audio (*.mp3)")
        self.mp3_queue.add_paths([Path(value) for value in files])

    def _remove_selected_slicer(self) -> None:
        self.slicer_queue.remove_selected()

    def _remove_selected_watermark(self) -> None:
        self.watermark_queue.remove_selected()

    def _remove_selected_mp3(self) -> None:
        self.mp3_queue.remove_selected()

    def _pick_watermark_png(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Choose watermark PNG", filter="PNG (*.png)")
        if path:
            self.wm_image_path = Path(path)
            self.wm_image_label.setText(self.wm_image_path.name)

    def _pick_cover(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Choose cover image", filter="Images (*.png *.jpg *.jpeg *.webp)")
        if path:
            self.meta_cover_path = Path(path)
            self.meta_cover_label.setText(self.meta_cover_path.name)

    def _validate_watermark(self) -> bool:
        valid = bool(self.wm_text.text().strip() or self.wm_image_path)
        self.wm_status.setText("Ready." if valid else "Enter text or choose a PNG.")
        return valid

    def _apply_preset(self) -> None:
        preset = self.presets.get(self.wm_preset.currentText())
        if preset is None:
            return
        self.wm_x.setValue(int(preset.x_ratio * 100))
        self.wm_y.setValue(int(preset.y_ratio * 100))
        self.wm_opacity.setValue(int(preset.opacity * 100))
        self.wm_scale.setValue(int(preset.scale * 100))
        self.wm_rotation.setValue(int(preset.rotation))

    def _save_preset_prompt(self) -> None:
        from PySide6.QtWidgets import QInputDialog

        name, ok = QInputDialog.getText(self, "Preset name", "Save preset as:")
        if not ok or not name.strip():
            return
        preset = WatermarkPreset(
            name.strip(),
            self.wm_x.value() / 100.0,
            self.wm_y.value() / 100.0,
            self.wm_opacity.value() / 100.0,
            self.wm_scale.value() / 100.0,
            float(self.wm_rotation.value()),
        )
        self.presets = self.preset_service.upsert_preset(self.presets, preset)
        self._refresh_presets()
        show_notification("success", f"Preset '{Path(name).stem}' saved.")

    def _delete_preset_current(self) -> None:
        name = self.wm_preset.currentText()
        if not name:
            return
        try:
            self.presets = self.preset_service.delete_preset(self.presets, name)
            self._refresh_presets()
            show_notification("success", f"Preset '{name}' deleted.")
        except AppError as exc:
            show_notification("error", str(exc))

    def _export_root(self) -> Path:
        root = Path(self.export_dir.text().strip() or self.settings.export_directory)
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _run_slice(self) -> None:
        sources = self.slicer_queue.selected_or_all_paths()
        if not sources:
            self.slicer_status.setText("Add at least one image.")
            show_notification("warning", "Add at least one image.")
            return
        self.slicer_status.setText("Processing...")

        def job() -> tuple[int, int]:
            success = 0
            failed = 0
            for source in sources:
                self.slicer_queue.update_item_state(source, "processing", 35)
                try:
                    self.image_service.slice_to_squares(source, self.square_size.value(), self._export_root() / source.stem)
                    self.slicer_queue.update_item_state(source, "done", 100)
                    success += 1
                except AppError:
                    self.slicer_queue.update_item_state(source, "error", 100)
                    failed += 1
            return success, failed

        self._run_async(job)

    def _run_watermark(self) -> None:
        if not self._validate_watermark():
            show_notification("warning", "Enter watermark text or choose a PNG.")
            return
        sources = self.watermark_queue.selected_or_all_paths()
        if not sources:
            show_notification("warning", "Add at least one image.")
            return

        def job() -> tuple[int, int]:
            success = 0
            failed = 0
            for source in sources:
                self.watermark_queue.update_item_state(source, "processing", 35)
                try:
                    request = WatermarkRequest(
                        source_path=source,
                        output_directory=self._export_root() / source.stem,
                        x_ratio=self.wm_x.value() / 100.0,
                        y_ratio=self.wm_y.value() / 100.0,
                        opacity=self.wm_opacity.value() / 100.0,
                        scale=self.wm_scale.value() / 100.0,
                        rotation=float(self.wm_rotation.value()),
                        watermark_image=self.wm_image_path,
                        watermark_text=self.wm_text.text().strip() or None,
                    )
                    self.watermark_service.apply_watermark(request)
                    self.watermark_queue.update_item_state(source, "done", 100)
                    success += 1
                except AppError:
                    self.watermark_queue.update_item_state(source, "error", 100)
                    failed += 1
            return success, failed

        self._run_async(job)

    def _run_metadata(self) -> None:
        sources = self.mp3_queue.selected_or_all_paths()
        if not sources:
            show_notification("warning", "Add at least one MP3 file.")
            return
        update = MetadataUpdate(
            title=self.meta_title.text().strip() or None,
            author=self.meta_author.text().strip() or None,
            tags=[tag.strip() for tag in self.meta_tags.text().split(",") if tag.strip()],
            cover_image_path=self.meta_cover_path,
        )

        def job() -> tuple[int, int]:
            success = 0
            failed = 0
            for source in sources:
                self.mp3_queue.update_item_state(source, "processing", 35)
                try:
                    self.metadata_service.create_tagged_copy(source, self._export_root() / source.stem, update)
                    self.mp3_queue.update_item_state(source, "done", 100)
                    success += 1
                except AppError:
                    self.mp3_queue.update_item_state(source, "error", 100)
                    failed += 1
            return success, failed

        self._run_async(job)

    def _run_async(self, fn) -> None:
        self.task_runner.start(fn, self._handle_job_result, lambda message: show_notification("error", message))

    def _handle_job_result(self, result: object) -> None:
        if isinstance(result, tuple) and len(result) == 2:
            success, failed = result
            kind = "success" if failed == 0 else "warning"
            show_notification(kind, f"Completed. Success: {success}, failed: {failed}.")
            return
        show_notification("info", "Operation completed.")

    def _set_coder_method(self, method: str) -> None:
        self._coder_method = method
        for name, button in self.coder_method_buttons.items():
            button.set_accent(name == method)
        self._update_coder_method()
        self._update_caesar_preview()

    def _update_coder_method(self) -> None:
        is_caesar = self._coder_method == "Caesar"
        self.coder_shift.setVisible(is_caesar)
        self.coder_shift_label.setVisible(is_caesar)
        placeholders = {
            "Morse": "Example: SOS",
            "Binary": "Example: Hello",
            "Base64": "Example: Hello",
            "Caesar": "Example: Attack at dawn",
        }
        self.coder_input.setPlaceholderText(placeholders[self._coder_method])

    def _run_coder(self, mode: str) -> None:
        text = self.coder_input.toPlainText()
        method = self._coder_method
        shift = self.coder_shift.value()
        try:
            output = self.coder_service.encode(method, text, shift) if mode == "encode" else self.coder_service.decode(method, text, shift)
            self.coder_output.setPlainText(output)
            self.coder_status.setText(f"{mode.title()} successful.")
            show_notification("success", f"{method} {mode} complete.")
        except AppError as exc:
            self.coder_status.setText(str(exc))
            show_notification("error", str(exc))

    def _update_caesar_preview(self) -> None:
        if self._coder_method != "Caesar" or not self.coder_input.toPlainText().strip():
            return
        try:
            preview = self.coder_service.encode("Caesar", self.coder_input.toPlainText(), self.coder_shift.value())
            self.coder_output.setPlainText(preview)
            self.coder_status.setText(f"Live preview for shift {self.coder_shift.value()}.")
        except AppError as exc:
            self.coder_status.setText(str(exc))

    def _swap_coder(self) -> None:
        src = self.coder_input.toPlainText()
        dst = self.coder_output.toPlainText()
        self.coder_input.setPlainText(dst)
        self.coder_output.setPlainText(src)
        self.coder_status.setText("Input and output swapped.")

    def _copy_coder_output(self) -> None:
        QGuiApplication.clipboard().setText(self.coder_output.toPlainText())
        show_notification("info", "Copied!")

    def _paste_coder_input(self) -> None:
        self.coder_input.setPlainText(QGuiApplication.clipboard().text())
        self.coder_status.setText("Clipboard pasted into input.")

    def _clear_coder(self) -> None:
        self.coder_input.clear()
        self.coder_output.clear()
        self.coder_status.setText("Cleared.")

    def _show_toast(self, kind: str, message: str) -> None:
        if self.settings.notifications_enabled:
            self.toast_manager.show_toast(kind, message)
