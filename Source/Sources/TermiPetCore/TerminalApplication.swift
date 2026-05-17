import Foundation

public enum TerminalApplication {
    public static func isSupported(bundleIdentifier: String?, localizedName: String?) -> Bool {
        CodingApplication.classify(bundleIdentifier: bundleIdentifier, localizedName: localizedName).kind == .terminal
    }
}
