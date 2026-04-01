from __future__ import annotations

from pathlib import Path
from typing import Callable

from PySide6.QtCore import QMimeData, QObject, QPoint, QRunnable, QThreadPool, Qt, QTimer, QVariantAnimation, Signal
from PySide6.QtGui import QColor, QDragEnterEvent, QDropEvent, QFont, QMouseEvent, QPainter, QPen, QPixmap
from PySide6.QtWidgets import (
    QAbstractItemView,
    QCheckBox,
    QFileIconProvider,
    QFrame,
    QGraphicsOpacityEffect,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QProgressBar,
    QPushButton,
    QSlider,
    QTextEdit,
    QToolButton,
    QVBoxLayout,
    QWidget,
)


class WorkerSignals(QObject):
    finished = Signal(object)
    failed = Signal(str)


class TaskRunnable(QRunnable):
    def __init__(self, fn: Callable[[], object]) -> None:
        super().__init__()
        self._fn = fn
        self.signals = WorkerSignals()

    def run(self) -> None:
        try:
            self.signals.finished.emit(self._fn())
        except Exception as exc:  # pragma: no cover
            self.signals.failed.emit(str(exc))


class TaskRunner:
    def __init__(self) -> None:
        self._pool = QThreadPool.globalInstance()

    def start(self, fn: Callable[[], object], on_success: Callable[[object], None], on_error: Callable[[str], None]) -> None:
        task = TaskRunnable(fn)
        task.signals.finished.connect(on_success)
        task.signals.failed.connect(on_error)
        self._pool.start(task)


class RetroButton(QPushButton):
    def __init__(self, text: str = "", accent: bool = False, flat_menu: bool = False, icon_name: str | None = None, parent: QWidget | None = None) -> None:
        super().__init__(text, parent)
        self._accent = accent
        self._flat_menu = flat_menu
        self._icon_name = icon_name
        self._hovered = False
        self.setCursor(Qt.PointingHandCursor)
        self.setMinimumHeight(34)
        self.setMinimumWidth(84)
        self.setFont(QFont("Courier New", 11))

    def set_accent(self, accent: bool) -> None:
        self._accent = accent
        self.update()

    def enterEvent(self, event) -> None:  # noqa: N802
        self._hovered = True
        self.update()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:  # noqa: N802
        self._hovered = False
        self.update()
        super().leaveEvent(event)

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        rect = self.rect().adjusted(0, 0, -1, -1)
        pressed = self.isDown()
        fill = QColor("#d4d4d4" if self._hovered else "#c0c0c0")
        if self._accent:
            fill = QColor("#c8d4f0" if self._hovered else "#b8c6ea")
        if self._flat_menu:
            fill = QColor("#c0c0c0")
        painter.fillRect(rect, fill)
        light = QPen(QColor("#ffffff"))
        dark = QPen(QColor("#000000"))
        mid = QPen(QColor("#808080"))
        if self._flat_menu:
            painter.setPen(dark)
            painter.drawRect(rect)
        elif pressed:
            painter.setPen(dark)
            painter.drawLine(rect.topLeft(), rect.topRight())
            painter.drawLine(rect.topLeft(), rect.bottomLeft())
            painter.setPen(light)
            painter.drawLine(rect.bottomLeft(), rect.bottomRight())
            painter.drawLine(rect.topRight(), rect.bottomRight())
            painter.setPen(mid)
            painter.drawRect(rect.adjusted(1, 1, -1, -1))
        else:
            painter.setPen(light)
            painter.drawLine(rect.topLeft(), rect.topRight())
            painter.drawLine(rect.topLeft(), rect.bottomLeft())
            painter.setPen(dark)
            painter.drawLine(rect.bottomLeft(), rect.bottomRight())
            painter.drawLine(rect.topRight(), rect.bottomRight())
            painter.setPen(mid)
            painter.drawRect(rect.adjusted(1, 1, -1, -1))
        offset = QPoint(1, 1) if pressed else QPoint(0, 0)
        painter.setPen(QColor("#000000"))
        if self._icon_name == "settings":
            self._draw_settings_icon(painter, rect.translated(offset))
            return
        painter.drawText(rect.translated(offset), Qt.AlignCenter, self.text())

    def _draw_settings_icon(self, painter: QPainter, rect) -> None:
        center = rect.center()
        painter.setBrush(QColor("#000000"))
        painter.setPen(QColor("#000000"))
        for dx, dy in ((0, -9), (6, -6), (9, 0), (6, 6), (0, 9), (-6, 6), (-9, 0), (-6, -6)):
            painter.drawRect(center.x() + dx - 1, center.y() + dy - 1, 3, 3)
        painter.setBrush(QColor("#c0c0c0"))
        painter.drawEllipse(center, 7, 7)
        painter.setBrush(QColor("#000000"))
        painter.drawEllipse(center, 2, 2)


class RetroToolButton(RetroButton):
    pass


class RetroInput(QLineEdit):
    def __init__(self, text: str = "", placeholder: str = "", parent: QWidget | None = None) -> None:
        super().__init__(text, parent)
        self.setPlaceholderText(placeholder)
        self.setMinimumHeight(28)
        self.setFont(QFont("Courier New", 10))


class RetroTextEdit(QTextEdit):
    def __init__(self, placeholder: str = "", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setPlaceholderText(placeholder)
        self.setFont(QFont("Courier New", 10))
        self.setMinimumHeight(120)


class RetroCheckBox(QCheckBox):
    def __init__(self, text: str = "", checked: bool = False, parent: QWidget | None = None) -> None:
        super().__init__(text, parent)
        self.setChecked(checked)
        self.setCursor(Qt.PointingHandCursor)
        self.setMinimumHeight(20)

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        box = self.rect().adjusted(0, 0, 0, 0)
        indicator = box.adjusted(0, (box.height() - 13) // 2, box.width() - 13, -(box.height() - 13) // 2)
        indicator.setWidth(13)
        indicator.setHeight(13)
        painter.fillRect(indicator, QColor("#ffffff"))
        painter.setPen(QColor("#000000"))
        painter.drawRect(indicator.adjusted(0, 0, -1, -1))
        if self.isChecked():
            painter.drawLine(indicator.left() + 2, indicator.center().y(), indicator.left() + 5, indicator.bottom() - 3)
            painter.drawLine(indicator.left() + 5, indicator.bottom() - 3, indicator.right() - 2, indicator.top() + 3)
        text_rect = self.rect().adjusted(20, 0, 0, 0)
        painter.drawText(text_rect, Qt.AlignVCenter | Qt.AlignLeft, self.text())


class LabeledToggle(QWidget):
    def __init__(self, text: str, checked: bool = False) -> None:
        super().__init__()
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)
        self.toggle = RetroCheckBox(text, checked)
        layout.addWidget(self.toggle)
        layout.addStretch()


class RetroSlider(QSlider):
    def __init__(self, orientation: Qt.Orientation, parent: QWidget | None = None) -> None:
        super().__init__(orientation, parent)
        self.setCursor(Qt.PointingHandCursor)


class NumberInput(QWidget):
    valueChanged = Signal(int)

    def __init__(self, minimum: int, maximum: int, value: int, suffix: str = "") -> None:
        super().__init__()
        self._minimum = minimum
        self._maximum = maximum
        self._suffix = suffix
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)
        self.minus = RetroButton("-")
        self.plus = RetroButton("+")
        self.minus.setFixedWidth(26)
        self.plus.setFixedWidth(26)
        self.edit = RetroInput()
        self.edit.setAlignment(Qt.AlignCenter)
        self.edit.editingFinished.connect(self._emit_from_text)
        self.minus.clicked.connect(lambda: self.setValue(self.value() - 1))
        self.plus.clicked.connect(lambda: self.setValue(self.value() + 1))
        self._hold_timer = QTimer(self)
        self._hold_timer.timeout.connect(self._repeat_step)
        self._hold_delta = 0
        self.minus.pressed.connect(lambda: self._start_hold(-1))
        self.plus.pressed.connect(lambda: self._start_hold(1))
        self.minus.released.connect(self._hold_timer.stop)
        self.plus.released.connect(self._hold_timer.stop)
        layout.addWidget(self.minus)
        layout.addWidget(self.edit, 1)
        layout.addWidget(self.plus)
        self.setValue(value)

    def value(self) -> int:
        text = self.edit.text().replace(self._suffix, "").strip()
        try:
            return max(self._minimum, min(self._maximum, int(text)))
        except ValueError:
            return self._minimum

    def setValue(self, value: int) -> None:  # noqa: N802
        clamped = max(self._minimum, min(self._maximum, int(value)))
        self.edit.setText(self._format(clamped))
        self.valueChanged.emit(clamped)

    def _format(self, value: int) -> str:
        return f"{value}{self._suffix}"

    def _emit_from_text(self) -> None:
        self.setValue(self.value())

    def _start_hold(self, delta: int) -> None:
        self._hold_delta = delta
        self._hold_timer.start(110)

    def _repeat_step(self) -> None:
        self.setValue(self.value() + self._hold_delta)


class SliderWithInput(QWidget):
    valueChanged = Signal(int)

    def __init__(self, minimum: int, maximum: int, value: int, suffix: str = "") -> None:
        super().__init__()
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)
        self.slider = RetroSlider(Qt.Horizontal)
        self.slider.setRange(minimum, maximum)
        self.number = NumberInput(minimum, maximum, value, suffix)
        self.slider.valueChanged.connect(self.number.setValue)
        self.number.valueChanged.connect(self.slider.setValue)
        self.number.valueChanged.connect(self.valueChanged.emit)
        self.slider.setValue(value)
        self.slider.setTracking(True)
        layout.addWidget(self.slider, 1)
        layout.addWidget(self.number)

    def value(self) -> int:
        return self.number.value()

    def setValue(self, value: int) -> None:  # noqa: N802
        self.number.setValue(value)


class FileQueueItemWidget(QWidget):
    deleteRequested = Signal(str)
    retryRequested = Signal(str)

    def __init__(self, path: Path, thumbnail: QPixmap, show_retry: bool = True) -> None:
        super().__init__()
        self.path = path
        self._show_retry = show_retry
        layout = QHBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(8)
        thumb = QLabel()
        thumb.setPixmap(thumbnail.scaled(40, 40, Qt.KeepAspectRatio, Qt.FastTransformation))
        thumb.setFixedSize(40, 40)
        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.progress.setValue(0)
        self.progress.setTextVisible(False)
        self.progress.setFixedHeight(12)
        self.status = QLabel("Queued")
        self.status.setObjectName("muted")
        text_col = QVBoxLayout()
        text_col.setSpacing(2)
        name_label = QLabel(path.name)
        name_label.setWordWrap(True)
        path_label = QLabel(str(path))
        path_label.setObjectName("muted")
        path_label.setWordWrap(True)
        text_col.addWidget(name_label)
        text_col.addWidget(path_label)
        text_col.addWidget(self.progress)
        text_col.addWidget(self.status)
        action_col = QVBoxLayout()
        action_col.setSpacing(4)
        self.delete_button = QToolButton()
        self.delete_button.setText("DEL")
        self.delete_button.clicked.connect(lambda: self.deleteRequested.emit(str(self.path)))
        self.retry_button = QToolButton()
        self.retry_button.setText("RET")
        self.retry_button.clicked.connect(lambda: self.retryRequested.emit(str(self.path)))
        action_col.addWidget(self.delete_button)
        if self._show_retry:
            action_col.addWidget(self.retry_button)
        action_col.addStretch()
        layout.addWidget(thumb)
        layout.addLayout(text_col, 1)
        layout.addLayout(action_col)

    def update_status(self, status: str, progress: int) -> None:
        labels = {
            "queued": "Queued",
            "processing": "Processing",
            "done": "Done",
            "error": "Error",
        }
        self.progress.setValue(progress)
        self.status.setText(labels.get(status, status.title()))
        self.retry_button.setVisible(self._show_retry and status == "error")


class FileQueueWidget(QListWidget):
    selectionPathChanged = Signal(str)

    def __init__(self, file_mode: str, show_retry: bool = True) -> None:
        super().__init__()
        self._file_mode = file_mode
        self._show_retry = show_retry
        self._provider = QFileIconProvider()
        self._drag_active = False
        self._hint = "Drop files or folders here"
        self.setAcceptDrops(True)
        self.viewport().setAcceptDrops(True)
        self.setDragEnabled(True)
        self.setDragDropMode(QAbstractItemView.InternalMove)
        self.setDefaultDropAction(Qt.MoveAction)
        self.itemSelectionChanged.connect(self._emit_path)

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:  # noqa: N802
        paths = self._extract_paths(event.mimeData())
        if paths:
            self._drag_active = True
            self._hint = f"Drop: {paths[0].name}" if len(paths) == 1 else f"Drop {len(paths)} files"
            self.viewport().update()
            event.acceptProposedAction()
            return
        super().dragEnterEvent(event)

    def dragLeaveEvent(self, event) -> None:  # noqa: N802
        self._drag_active = False
        self._hint = "Drop files or folders here"
        self.viewport().update()
        super().dragLeaveEvent(event)

    def dragMoveEvent(self, event) -> None:  # noqa: N802
        if self._extract_paths(event.mimeData()):
            event.acceptProposedAction()
            return
        super().dragMoveEvent(event)

    def dropEvent(self, event: QDropEvent) -> None:  # noqa: N802
        paths = self._extract_paths(event.mimeData())
        if paths:
            self.add_paths(paths)
            self._drag_active = False
            self._hint = "Drop files or folders here"
            self.viewport().update()
            event.acceptProposedAction()
            return
        super().dropEvent(event)

    def paintEvent(self, event) -> None:  # noqa: N802
        super().paintEvent(event)
        if self.count() == 0 or self._drag_active:
            painter = QPainter(self.viewport())
            rect = self.viewport().rect().adjusted(8, 8, -8, -8)
            painter.fillRect(rect, QColor("#d6d6d6" if self._drag_active else "#cfcfcf"))
            pen = QPen(QColor("#000000"), 1, Qt.DashLine if self._drag_active else Qt.SolidLine)
            painter.setPen(pen)
            painter.drawRect(rect)
            painter.drawText(rect.adjusted(8, 8, -8, -8), Qt.AlignCenter | Qt.TextWordWrap, self._hint)

    def add_paths(self, paths: list[Path]) -> None:
        existing = {self.item(i).data(Qt.UserRole) for i in range(self.count())}
        for path in paths:
            normalized = str(path)
            if normalized in existing:
                continue
            item = QListWidgetItem()
            item.setData(Qt.UserRole, normalized)
            self.addItem(item)
            widget = FileQueueItemWidget(path, self._thumbnail(path), self._show_retry)
            widget.deleteRequested.connect(self.remove_path)
            widget.retryRequested.connect(lambda path_str: self.update_item_state(Path(path_str), "queued", 0))
            item.setSizeHint(widget.sizeHint())
            self.setItemWidget(item, widget)

    def remove_path(self, path_str: str) -> None:
        for index in range(self.count()):
            item = self.item(index)
            if item.data(Qt.UserRole) == path_str:
                self.takeItem(index)
                return

    def remove_selected(self) -> None:
        for item in self.selectedItems():
            self.remove_path(str(item.data(Qt.UserRole)))

    def selected_or_all_paths(self) -> list[Path]:
        items = self.selectedItems() or [self.item(i) for i in range(self.count())]
        return [Path(str(item.data(Qt.UserRole))) for item in items]

    def update_item_state(self, path: Path, status: str, progress: int) -> None:
        for index in range(self.count()):
            item = self.item(index)
            if item.data(Qt.UserRole) != str(path):
                continue
            widget = self.itemWidget(item)
            if isinstance(widget, FileQueueItemWidget):
                widget.update_status(status, progress)
            return

    def _emit_path(self) -> None:
        selected = self.selectedItems()
        if selected:
            self.selectionPathChanged.emit(str(selected[0].data(Qt.UserRole)))

    def _extract_paths(self, mime_data: QMimeData) -> list[Path]:
        if not mime_data.hasUrls():
            return []
        suffixes = {".mp3"} if self._file_mode == "mp3" else {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
        files: list[Path] = []
        for url in mime_data.urls():
            path = Path(url.toLocalFile())
            if not path.exists():
                continue
            if path.is_dir():
                files.extend(candidate for candidate in sorted(path.rglob("*")) if candidate.suffix.lower() in suffixes)
            elif path.suffix.lower() in suffixes:
                files.append(path)
        return files

    def _thumbnail(self, path: Path) -> QPixmap:
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
            pixmap = QPixmap(str(path))
            if not pixmap.isNull():
                return pixmap
        return self._provider.icon(path).pixmap(40, 40)


class DesktopIconButton(QWidget):
    clicked = Signal()

    def __init__(self, label: str, icon_key: str) -> None:
        super().__init__()
        self._label = label
        self._icon = self._build_icon(icon_key)
        self._hovered = False
        self._pressed = False
        self.setFixedSize(138, 152)
        self.setCursor(Qt.PointingHandCursor)

    def enterEvent(self, event) -> None:  # noqa: N802
        self._hovered = True
        self.update()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:  # noqa: N802
        self._hovered = False
        self._pressed = False
        self.update()
        super().leaveEvent(event)

    def mousePressEvent(self, event: QMouseEvent) -> None:  # noqa: N802
        if event.button() == Qt.LeftButton:
            self._pressed = True
            self.update()
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:  # noqa: N802
        was_pressed = self._pressed
        self._pressed = False
        self.update()
        if was_pressed and self.rect().contains(event.pos()):
            self.clicked.emit()
        super().mouseReleaseEvent(event)

    def paintEvent(self, event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor("#c0c0c0"))
        if self._hovered or self._pressed:
            painter.setPen(QColor("#000000"))
            painter.drawRect(self.rect().adjusted(6, 6, -7, -27))
        icon_rect = self.rect().adjusted(26, 14, -26, -50)
        target = self._icon.rect()
        target.moveCenter(icon_rect.center() + QPoint(1, 1) if self._pressed else icon_rect.center())
        painter.drawPixmap(target.topLeft(), self._icon)
        text_rect = self.rect().adjusted(10, self.height() - 30, -10, -6)
        label_width = max(44, min(text_rect.width(), len(self._label) * 8 + 10))
        chip_rect = text_rect
        chip_rect.setLeft(text_rect.center().x() - label_width // 2)
        chip_rect.setWidth(label_width)
        painter.fillRect(chip_rect, QColor("#ffffff"))
        painter.setPen(QColor("#000000"))
        painter.drawRect(chip_rect.adjusted(0, 0, -1, -1))
        painter.drawText(chip_rect.translated(1, 1) if self._pressed else chip_rect, Qt.AlignCenter | Qt.TextWordWrap, self._label)

    def _build_icon(self, key: str) -> QPixmap:
        pixmap = QPixmap(40, 40)
        pixmap.fill(QColor("#c0c0c0"))
        painter = QPainter(pixmap)
        painter.setPen(QColor("#000000"))
        painter.setBrush(QColor("#ffffff"))
        painter.drawRect(4, 4, 31, 31)
        painter.setBrush(QColor("#000080"))
        if key == "slicer":
            painter.drawRect(7, 7, 10, 10)
            painter.drawRect(19, 7, 12, 10)
            painter.drawRect(7, 19, 10, 12)
            painter.drawRect(19, 19, 12, 12)
        elif key == "watermarker":
            painter.drawRect(7, 9, 24, 7)
            painter.drawRect(12, 20, 14, 9)
            painter.setBrush(QColor("#000000"))
            painter.drawRect(14, 13, 10, 2)
        elif key == "coder":
            painter.drawRect(7, 10, 5, 20)
            painter.drawRect(16, 15, 8, 4)
            painter.drawRect(28, 10, 5, 20)
        else:
            painter.drawRect(9, 9, 22, 17)
            painter.drawRect(13, 13, 14, 2)
            painter.drawRect(13, 17, 12, 2)
            painter.drawRect(13, 21, 10, 2)
        painter.end()
        return pixmap


class RetroWindow(QFrame):
    closeRequested = Signal()

    def __init__(self) -> None:
        super().__init__()
        self.setObjectName("retroWindow")
        self.setFrameShape(QFrame.Box)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(2, 2, 2, 2)
        outer.setSpacing(0)
        self.title_bar = QFrame()
        self.title_bar.setObjectName("windowTitleBar")
        title_layout = QHBoxLayout(self.title_bar)
        title_layout.setContentsMargins(6, 3, 3, 3)
        title_layout.setSpacing(6)
        self.title_label = QLabel("")
        self.title_label.setObjectName("windowTitleText")
        self.close_button = RetroButton("X")
        self.close_button.setFixedSize(24, 22)
        self.close_button.clicked.connect(self.closeRequested.emit)
        title_layout.addWidget(self.title_label, 1)
        title_layout.addWidget(self.close_button)
        self.body = QFrame()
        self.body.setObjectName("retroPanel")
        self.body_layout = QVBoxLayout(self.body)
        self.body_layout.setContentsMargins(12, 12, 12, 12)
        self.body_layout.setSpacing(10)
        outer.addWidget(self.title_bar)
        outer.addWidget(self.body, 1)

    def set_title(self, title: str) -> None:
        self.title_label.setText(title)

    def set_content(self, widget: QWidget) -> None:
        while self.body_layout.count():
            item = self.body_layout.takeAt(0)
            child = item.widget()
            if child is not None:
                child.setParent(None)
        self.body_layout.addWidget(widget)


class ToastCard(QFrame):
    dismissed = Signal(QWidget)

    def __init__(self, kind: str, message: str) -> None:
        super().__init__()
        self.setObjectName("toastCard")
        self.setMinimumWidth(420 if kind == "success" else 320)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        colors = {
            "success": "#008000",
            "error": "#800000",
            "warning": "#808000",
            "info": "#000080",
        }
        labels = {
            "success": "[OK]",
            "error": "[ER]",
            "warning": "[!]",
            "info": "[i]",
        }
        icon = QLabel(labels.get(kind, "[i]"))
        icon.setStyleSheet(f"color: {colors.get(kind, '#000080')}; font-weight: bold;")
        text = QLabel(message)
        text.setFont(QFont("Courier New", 11, QFont.Bold if kind == "success" else QFont.Normal))
        text.setWordWrap(True)
        layout.addWidget(icon)
        layout.addWidget(text, 1)
        self._effect = QGraphicsOpacityEffect(self)
        self.setGraphicsEffect(self._effect)
        self._effect.setOpacity(0.0)
        self._fade_in = QVariantAnimation(self, duration=200, startValue=0.0, endValue=1.0)
        self._fade_in.valueChanged.connect(self._effect.setOpacity)
        self._fade_out = QVariantAnimation(self, duration=300, startValue=1.0, endValue=0.0)
        self._fade_out.valueChanged.connect(self._effect.setOpacity)
        self._fade_out.finished.connect(lambda: self.dismissed.emit(self))
        self._timer = QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.setInterval(1600)
        self._timer.timeout.connect(self._fade_out.start)
        self._fade_in.start()
        self._timer.start()

    def enterEvent(self, event) -> None:  # noqa: N802
        self._timer.stop()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:  # noqa: N802
        self._timer.start()
        super().leaveEvent(event)


class ToastManager(QWidget):
    def __init__(self, parent: QWidget) -> None:
        super().__init__(parent)
        self.setGeometry(parent.rect())
        self._corner = "bottom-right"
        self._items: list[ToastCard] = []
        self._last_message = ""
        self.hide()

    def set_corner(self, corner: str) -> None:
        self._corner = corner
        self._relayout()

    def show_toast(self, kind: str, message: str) -> None:
        if message == self._last_message and self._items:
            return
        self._last_message = message
        self.show()
        card = ToastCard(kind, message)
        card.setParent(self)
        card.dismissed.connect(self._remove_card)
        card.show()
        self._items.append(card)
        self._relayout()

    def resizeEvent(self, event) -> None:  # noqa: N802
        self._relayout()
        super().resizeEvent(event)

    def _remove_card(self, widget: QWidget) -> None:
        self._items = [item for item in self._items if item is not widget]
        widget.deleteLater()
        self._relayout()
        if not self._items:
            self.hide()

    def _relayout(self) -> None:
        parent = self.parentWidget()
        if parent is None:
            return
        self.setGeometry(parent.rect())
        margin = 14
        spacing = 8
        top = self._corner.startswith("top")
        right = self._corner.endswith("right")
        running = margin
        items = list(self._items) if top else list(reversed(self._items))
        for card in items:
            size = card.sizeHint()
            x = self.width() - size.width() - margin if right else margin
            y = running if top else self.height() - size.height() - running
            card.move(x, y)
            running += size.height() + spacing
