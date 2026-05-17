import Foundation

public enum CommandPanelLayout {
    public static let headerButtonWidth: Double = 26
    public static let headerButtonSpacing: Double = 10
    public static let headerTrailingSafetyPadding: Double = 8

    public static let headerActionReservedWidth: Double = headerButtonWidth * 2
        + headerButtonSpacing
        + headerTrailingSafetyPadding

    public static let dragHandleTrailingPadding: Double = headerActionReservedWidth
}
