import AppKit
import SwiftUI

struct ResizeHandleView: NSViewRepresentable {
    let onDragChanged: @MainActor (CGFloat) -> Void

    func makeNSView(context: Context) -> ResizeHandleNSView {
        ResizeHandleNSView(onDragChanged: onDragChanged)
    }

    func updateNSView(_ nsView: ResizeHandleNSView, context: Context) {
        nsView.onDragChanged = onDragChanged
    }
}

final class ResizeHandleNSView: NSView {
    var onDragChanged: @MainActor (CGFloat) -> Void
    private var initialMouseY: CGFloat?

    init(onDragChanged: @escaping @MainActor (CGFloat) -> Void) {
        self.onDragChanged = onDragChanged
        super.init(frame: .zero)
        addTrackingArea(NSTrackingArea(
            rect: .zero,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self
        ))
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func resetCursorRects() {
        addCursorRect(bounds, cursor: .resizeUpDown)
    }

    override func mouseEntered(with event: NSEvent) {
        NSCursor.resizeUpDown.push()
    }

    override func mouseExited(with event: NSEvent) {
        NSCursor.pop()
    }

    override func mouseDown(with event: NSEvent) {
        initialMouseY = event.locationInWindow.y
    }

    override func mouseDragged(with event: NSEvent) {
        guard let initialMouseY else { return }
        let delta = event.locationInWindow.y - initialMouseY
        Task { @MainActor in
            onDragChanged(delta)
        }
    }

    override func mouseUp(with event: NSEvent) {
        initialMouseY = nil
    }
}
