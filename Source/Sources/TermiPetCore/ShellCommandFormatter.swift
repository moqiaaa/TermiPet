import Foundation

public enum ShellCommandFormatter {
    public static func cdCommand(forPath path: String) -> String {
        "cd \(shellWord(path))"
    }

    private static func shellWord(_ value: String) -> String {
        let safeScalars = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_+-./:")
        if value.unicodeScalars.allSatisfy({ safeScalars.contains($0) }) {
            return value
        }

        return "'\(value.replacingOccurrences(of: "'", with: "'\\''"))'"
    }
}
