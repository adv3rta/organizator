from __future__ import annotations

from PySide6.QtCore import QObject, Signal


class NotificationBus(QObject):
    notify = Signal(str, str)

    def show_notification(self, kind: str, message: str) -> None:
        self.notify.emit(kind, message)


notification_bus = NotificationBus()


def show_notification(kind: str, message: str) -> None:
    notification_bus.show_notification(kind, message)
