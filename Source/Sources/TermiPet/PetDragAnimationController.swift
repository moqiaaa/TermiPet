import Foundation

@MainActor
final class PetDragAnimationController: ObservableObject {
    @Published private(set) var isDragging = false

    private let startDelay: Duration
    private let endDelay: Duration
    private var startTask: Task<Void, Never>?
    private var endTask: Task<Void, Never>?

    init(startDelay: Duration = .milliseconds(60), endDelay: Duration = .milliseconds(180)) {
        self.startDelay = startDelay
        self.endDelay = endDelay
    }

    func beginDragging() {
        endTask?.cancel()
        startTask?.cancel()
        isDragging = true
    }

    func endDragging() {
        startTask?.cancel()
        endTask?.cancel()
        guard isDragging else { return }
        endTask = Task { [endDelay] in
            try? await Task.sleep(for: endDelay)
            guard !Task.isCancelled else { return }
            isDragging = false
        }
    }

    func reset() {
        startTask?.cancel()
        endTask?.cancel()
        isDragging = false
    }
}
