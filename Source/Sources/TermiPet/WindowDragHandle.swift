import AppKit
import SwiftUI

struct WindowDragHandle: NSViewRepresentable {
    var onDragStart: (() -> Void)?
    var onDragEnd: (() -> Void)?
    var onDoubleClick: (() -> Void)?

    func makeNSView(context: Context) -> NSView {
        let view = DragView()
        view.onDragStart = onDragStart
        view.onDragEnd = onDragEnd
        view.onDoubleClick = onDoubleClick
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        guard let view = nsView as? DragView else { return }
        view.onDragStart = onDragStart
        view.onDragEnd = onDragEnd
        view.onDoubleClick = onDoubleClick
    }

    private final class DragView: NSView {
        var onDragStart: (() -> Void)?
        var onDragEnd: (() -> Void)?
        var onDoubleClick: (() -> Void)?
        private var dragStartMouseLocation: NSPoint?
        private var dragStartWindowOrigin: NSPoint?
        private var didBeginDragging = false

        override var mouseDownCanMoveWindow: Bool { false }
        override func hitTest(_ point: NSPoint) -> NSView? {
            guard bounds.contains(point) else {
                return nil
            }
            return self
        }

        override func mouseDown(with event: NSEvent) {
            guard let window else { return }
            guard event.type == .leftMouseDown && !event.modifierFlags.contains(.control) else {
                super.mouseDown(with: event)
                return
            }

            if event.clickCount == 2 {
                onDoubleClick?()
                return
            }

            dragStartMouseLocation = screenLocation(for: event, in: window)
            dragStartWindowOrigin = window.frame.origin
            didBeginDragging = false
        }

        override func rightMouseDown(with event: NSEvent) {
            super.rightMouseDown(with: event)
        }

        override func mouseDragged(with event: NSEvent) {
            guard let window,
                  let dragStartMouseLocation,
                  let dragStartWindowOrigin else { return }

            let currentMouseLocation = screenLocation(for: event, in: window)
            let deltaX = currentMouseLocation.x - dragStartMouseLocation.x
            let deltaY = currentMouseLocation.y - dragStartMouseLocation.y
            window.setFrameOrigin(NSPoint(
                x: dragStartWindowOrigin.x + deltaX,
                y: dragStartWindowOrigin.y + deltaY
            ))

            if !didBeginDragging {
                didBeginDragging = true
                onDragStart?()
            }
        }

        override func mouseUp(with event: NSEvent) {
            dragStartMouseLocation = nil
            dragStartWindowOrigin = nil
            guard didBeginDragging else { return }
            didBeginDragging = false
            onDragEnd?()
        }

        private func screenLocation(for event: NSEvent, in window: NSWindow) -> NSPoint {
            window.convertPoint(toScreen: event.locationInWindow)
        }
    }
}
