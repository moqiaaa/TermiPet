import AppKit
import TermiPetCore

@MainActor
final class TargetApplicationTracker {
    private var targetApplication: NSRunningApplication?

    @discardableResult
    func refreshFromFrontmostApplication() -> Bool {
        if let frontmost = NSWorkspace.shared.frontmostApplication,
           frontmost.processIdentifier != NSRunningApplication.current.processIdentifier,
           isSupportedTerminal(frontmost) {
            targetApplication = frontmost
            return true
        }

        if let targetApplication,
           !targetApplication.isTerminated,
           isSupportedTerminal(targetApplication) {
            return true
        }

        guard let runningTerminal = runningTerminalApplications().first else {
            targetApplication = nil
            return false
        }

        targetApplication = runningTerminal
        return true
    }

    func currentTargetApplication() -> NSRunningApplication? {
        _ = refreshFromFrontmostApplication()
        return targetApplication
    }

    func lastTargetApplication() -> NSRunningApplication? {
        targetApplication
    }

    func isFrontmostApplicationSupportedTerminal() -> Bool {
        guard let frontmost = NSWorkspace.shared.frontmostApplication,
              frontmost.processIdentifier != NSRunningApplication.current.processIdentifier else {
            return targetApplication != nil
        }

        return isSupportedTerminal(frontmost)
    }

    func hasAvailableTerminal() -> Bool {
        refreshFromFrontmostApplication()
    }

    private func runningTerminalApplications() -> [NSRunningApplication] {
        NSWorkspace.shared.runningApplications
            .filter { $0.processIdentifier != NSRunningApplication.current.processIdentifier }
            .filter { !$0.isTerminated }
            .filter { isSupportedTerminal($0) }
            .sorted { lhs, rhs in
                if lhs.isActive != rhs.isActive {
                    return lhs.isActive
                }
                return lhs.processIdentifier > rhs.processIdentifier
            }
    }

    private func isSupportedTerminal(_ application: NSRunningApplication) -> Bool {
        TerminalApplication.isSupported(
            bundleIdentifier: application.bundleIdentifier,
            localizedName: application.localizedName
        )
    }
}
