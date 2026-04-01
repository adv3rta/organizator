from __future__ import annotations


def build_stylesheet() -> str:
    return """
    QWidget {
        color: #000000;
        font-family: "Courier New";
        font-size: 12px;
        background: transparent;
    }
    QMainWindow {
        background: #bdbdbd;
    }
    QLabel#pageTitle {
        font-weight: bold;
        font-size: 12px;
        color: #000000;
    }
    QLabel#muted {
        color: #303030;
    }
    QFrame#desktopSurface,
    QFrame#retroPanel,
    QFrame#retroWindow,
    QFrame#launchPanel,
    QFrame#toastCard {
        background: #c0c0c0;
        border: 1px solid #000000;
    }
    QFrame#topBar {
        background: #f4f4f4;
        border: 1px solid #000000;
    }
    QFrame#overlayShade {
        background: rgba(160, 160, 160, 140);
        border: none;
    }
    QFrame#windowTitleBar {
        background: #000080;
        color: #ffffff;
        border-bottom: 1px solid #000000;
    }
    QLabel#windowTitleText {
        color: #ffffff;
        font-weight: bold;
    }
    QLineEdit,
    QTextEdit,
    QComboBox,
    QListWidget {
        background: #ffffff;
        color: #000000;
        border: 1px solid #000000;
        padding: 4px;
        selection-background-color: #000080;
        selection-color: #ffffff;
    }
    QTextEdit[readOnly="true"] {
        background: #efefef;
    }
    QCheckBox {
        spacing: 6px;
    }
    QCheckBox::indicator {
        width: 13px;
        height: 13px;
        background: #ffffff;
        border: 1px solid #000000;
    }
    QCheckBox::indicator:checked {
        background: #000080;
    }
    QToolButton {
        background: #c0c0c0;
        border: 1px solid #000000;
        padding: 2px 4px;
    }
    QMenu {
        background: #c0c0c0;
        border: 1px solid #000000;
        padding: 2px;
    }
    QMenu::item {
        padding: 4px 22px 4px 16px;
        color: #000000;
    }
    QMenu::item:selected {
        background: #000080;
        color: #ffffff;
    }
    QProgressBar {
        background: #ffffff;
        border: 1px solid #000000;
        padding: 1px;
    }
    QProgressBar::chunk {
        background: #000080;
        width: 8px;
        margin: 0px;
    }
    QSlider::groove:horizontal {
        background: #808080;
        border: 1px solid #000000;
        height: 6px;
    }
    QSlider::sub-page:horizontal {
        background: #000080;
    }
    QSlider::handle:horizontal {
        background: #c0c0c0;
        border: 1px solid #000000;
        width: 12px;
        margin: -4px 0px;
    }
    QScrollBar:vertical {
        width: 14px;
        background: #c0c0c0;
        border: 1px solid #000000;
    }
    QScrollBar::handle:vertical {
        background: #9f9f9f;
        border: 1px solid #000000;
        min-height: 20px;
    }
    QScrollBar::add-line:vertical,
    QScrollBar::sub-line:vertical,
    QScrollBar::add-page:vertical,
    QScrollBar::sub-page:vertical,
    QScrollBar:horizontal,
    QScrollBar::add-line:horizontal,
    QScrollBar::sub-line:horizontal,
    QScrollBar::add-page:horizontal,
    QScrollBar::sub-page:horizontal {
        background: #c0c0c0;
        border: none;
        height: 0px;
        width: 0px;
    }
    QToolTip {
        background: #ffffe1;
        color: #000000;
        border: 1px solid #000000;
        padding: 2px;
    }
    """
