import AppKit
import Foundation

@MainActor
final class PomodoroTimer: ObservableObject {
    enum Phase {
        case idle
        case work
        case breakTime
    }

    static let workSeconds = 25 * 60
    static let breakSeconds = 5 * 60

    @Published private(set) var phase: Phase = .idle
    @Published private(set) var remainingSeconds: Int = 0
    @Published private(set) var isPaused: Bool = false
    @Published private(set) var celebratePulse: Int = 0

    private var timer: Timer?

    var isActive: Bool { phase != .idle }

    var displayText: String {
        let minutes = remainingSeconds / 60
        let seconds = remainingSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    func toggle() {
        switch phase {
        case .idle:
            start(phase: .work)
        case .work, .breakTime:
            isPaused.toggle()
        }
    }

    func stop() {
        reset()
    }

    func startBreak() {
        start(phase: .breakTime)
    }

    func reset() {
        timer?.invalidate()
        timer = nil
        phase = .idle
        remainingSeconds = 0
        isPaused = false
    }

    private func start(phase newPhase: Phase) {
        phase = newPhase
        isPaused = false
        remainingSeconds = (newPhase == .work) ? Self.workSeconds : Self.breakSeconds
        scheduleTimer()
    }

    private func scheduleTimer() {
        timer?.invalidate()
        let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func tick() {
        guard !isPaused, phase != .idle else { return }
        if remainingSeconds > 0 {
            remainingSeconds -= 1
            return
        }
        advancePhase()
    }

    private func advancePhase() {
        playEndSound()
        celebratePulse &+= 1
        switch phase {
        case .work:
            start(phase: .breakTime)
        case .breakTime, .idle:
            reset()
        }
    }

    private func playEndSound() {
        if let sound = NSSound(named: NSSound.Name("Glass")) {
            sound.play()
        } else {
            NSSound.beep()
        }
    }
}
