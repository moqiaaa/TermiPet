public enum PetActionResolver {
    public static let draggingAction = 2

    public static func resolve(
        isDragging: Bool,
        previewAction: Int?,
        commandsExpanded: Bool,
        suggestedAction: Int
    ) -> Int {
        // 拖动时不改变动作，保持原动作
        // if isDragging { return draggingAction }
        if let previewAction { return previewAction }
        if commandsExpanded { return 8 }
        return suggestedAction
    }
}
