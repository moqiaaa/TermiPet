import TermiPetCore
import SwiftUI
import UniformTypeIdentifiers

struct CommandsTabView: View {
    @Binding var configuration: CommandConfiguration
    let onSaveConfiguration: @MainActor (CommandConfiguration) -> Void
    let localizer: AppLocalizer

    @State private var showingAddSheet = false
    @State private var draft = NewCommandDraft()
    @State private var saveMessage = ""
    @State private var draggingCommandID: FloatingCommand.ID?
    @Environment(\.appSkin) private var skin

    private var pinnedCommands: [FloatingCommand] {
        let pinnedIDs = Set(configuration.pinnedCommandIDs)
        return configuration.commands.filter { pinnedIDs.contains($0.id) }
    }

    private var unpinnedCommands: [FloatingCommand] {
        let pinnedIDs = Set(configuration.pinnedCommandIDs)
        return configuration.commands.filter { !pinnedIDs.contains($0.id) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text(localizer[.commandPanelTitle])
                    .font(.system(size: 16, weight: .semibold))

                Spacer()

                Button {
                    draft = NewCommandDraft()
                    showingAddSheet = true
                } label: {
                    Label(localizer[.commandsAdd], systemImage: "plus")
                        .font(.system(size: 13, weight: .medium))
                }
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if !pinnedCommands.isEmpty {
                        sectionHeader(localizer[.commandsPinnedSection])
                        ForEach(pinnedCommands) { command in
                            commandRow(command, isPinned: true)
                                .onDrag {
                                    draggingCommandID = command.id
                                    return NSItemProvider(object: command.id as NSString)
                                }
                                .onDrop(
                                    of: [.text],
                                    delegate: CommandRowDropDelegate(
                                        targetID: command.id,
                                        isPinnedSection: true,
                                        draggingCommandID: $draggingCommandID,
                                        onMove: moveDraggedCommand
                                    )
                                )
                        }
                    }

                    if !unpinnedCommands.isEmpty {
                        sectionHeader(localizer[.commandsAllSection])
                        ForEach(unpinnedCommands) { command in
                            commandRow(command, isPinned: false)
                                .onDrag {
                                    draggingCommandID = command.id
                                    return NSItemProvider(object: command.id as NSString)
                                }
                                .onDrop(
                                    of: [.text],
                                    delegate: CommandRowDropDelegate(
                                        targetID: command.id,
                                        isPinnedSection: false,
                                        draggingCommandID: $draggingCommandID,
                                        onMove: moveDraggedCommand
                                    )
                                )
                        }
                    }
                }
                .padding(.trailing, 4)
            }
            .scrollIndicators(.automatic)

            HStack {
                Spacer()
                Label(saveMessage.isEmpty ? localizer[.commandsAutoSave] : saveMessage, systemImage: "checkmark.circle")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(saveMessage.isEmpty ? Color.secondary : Color.green)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .sheet(isPresented: $showingAddSheet) {
            AddCommandSheet(
                draft: $draft,
                onCancel: {
                    showingAddSheet = false
                    draft = NewCommandDraft()
                },
                onConfirm: {
                    guard draft.isValid else { return }
                    appendDraftToConfiguration(draft)
                    showingAddSheet = false
                    draft = NewCommandDraft()
                },
                localizer: localizer
            )
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(skin.settingsSecondaryTextColor)
            .padding(.top, 4)
    }

    private func commandRow(_ command: FloatingCommand, isPinned: Bool) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "line.3.horizontal")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(skin.settingsSecondaryTextColor)
                .frame(width: 18, height: 24)
                .help(localizer[.commandsDragSort])

            VStack(alignment: .leading, spacing: 3) {
                Text(command.title)
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .lineLimit(1)
                    .truncationMode(.middle)

                let localizedSummary = command.localizedSummary(localizer)
                if !localizedSummary.isEmpty {
                    Text(localizedSummary)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(skin.settingsSecondaryTextColor)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
            }

            Spacer()

            Button {
                togglePinned(command)
            } label: {
                Image(systemName: isPinned ? "pin.fill" : "pin")
                    .font(.system(size: 12, weight: .medium))
            }
            .buttonStyle(.plain)
            .foregroundStyle(isPinned ? Color.accentColor : .secondary)
            .help(isPinned ? localizer[.commandsUnpin] : localizer[.commandsPin])

            if command.isCustom {
                Button {
                    deleteCommandFromConfiguration(command)
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
                .help(localizer[.commandsDelete])
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(rowBackground, in: RoundedRectangle(cornerRadius: skin == .pixel ? 0 : 6, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: skin == .pixel ? 0 : 6, style: .continuous)
                .strokeBorder(rowBorder, lineWidth: skin == .pixel ? 1.4 : 0.8)
        )
        .onDrop(
            of: [.text],
            delegate: CommandRowDropDelegate(
                targetID: command.id,
                isPinnedSection: isPinned,
                draggingCommandID: $draggingCommandID,
                onMove: moveDraggedCommand
            )
        )
    }

    private var rowBackground: some ShapeStyle {
        switch skin {
        case .glass: AnyShapeStyle(.regularMaterial)
        case .dark: AnyShapeStyle(Color.white.opacity(0.055))
        case .pixel: AnyShapeStyle(Color(red: 0.08, green: 0.12, blue: 0.20))
        }
    }

    private var rowBorder: Color {
        switch skin {
        case .glass: skin.settingsSubtleStrokeColor
        case .dark: Color.white.opacity(0.10)
        case .pixel: Color(red: 0.99, green: 0.78, blue: 0.28).opacity(0.75)
        }
    }

    private func appendDraftToConfiguration(_ draft: NewCommandDraft) {
        let command = FloatingCommand.custom(
            title: draft.trimmedTitle,
            text: draft.trimmedText,
            summary: draft.trimmedSummary
        )
        var next = configuration
        next.userCommands.append(command)
        next.commandOrder.append(command.id)
        persist(next)
    }

    private func deleteCommandFromConfiguration(_ command: FloatingCommand) {
        var next = configuration
        next.userCommands.removeAll { $0.id == command.id }
        next.pinnedCommandIDs.removeAll { $0 == command.id }
        next.commandOrder.removeAll { $0 == command.id }
        persist(next)
    }

    private func togglePinned(_ command: FloatingCommand) {
        var next = configuration
        if next.pinnedCommandIDs.contains(command.id) {
            next.pinnedCommandIDs.removeAll { $0 == command.id }
        } else {
            next.pinnedCommandIDs.append(command.id)
        }
        persist(next)
    }

    private func moveDraggedCommand(
        draggingID: FloatingCommand.ID,
        targetID: FloatingCommand.ID,
        isPinnedSection: Bool
    ) {
        guard draggingID != targetID else { return }

        var next = configuration
        if isPinnedSection {
            if !next.pinnedCommandIDs.contains(draggingID) {
                next.pinnedCommandIDs.append(draggingID)
            }
        } else {
            next.pinnedCommandIDs.removeAll { $0 == draggingID }
        }

        let interim = CommandConfiguration(
            primaryAction: next.primaryAction,
            userCommands: next.userCommands,
            pinnedCommandIDs: next.pinnedCommandIDs,
            commandOrder: next.commandOrder
        )
        let pinnedIDSet = Set(interim.pinnedCommandIDs)
        var pinnedIDs = interim.commands.filter { pinnedIDSet.contains($0.id) }.map(\.id)
        var unpinnedIDs = interim.commands.filter { !pinnedIDSet.contains($0.id) }.map(\.id)
        var sectionIDs = isPinnedSection ? pinnedIDs : unpinnedIDs

        guard let sourceIndex = sectionIDs.firstIndex(of: draggingID),
              let targetIndex = sectionIDs.firstIndex(of: targetID) else { return }

        let destination = targetIndex > sourceIndex ? targetIndex + 1 : targetIndex
        sectionIDs.move(fromOffsets: IndexSet(integer: sourceIndex), toOffset: destination)

        if isPinnedSection {
            pinnedIDs = sectionIDs
            next.pinnedCommandIDs = pinnedIDs
        } else {
            unpinnedIDs = sectionIDs
            next.pinnedCommandIDs = pinnedIDs
        }
        next.commandOrder = pinnedIDs + unpinnedIDs
        persist(next)
    }

    private func persist(_ next: CommandConfiguration) {
        configuration = next
        onSaveConfiguration(next)
        saveMessage = localizer[.saved]
    }
}

private struct CommandRowDropDelegate: DropDelegate {
    let targetID: FloatingCommand.ID
    let isPinnedSection: Bool
    @Binding var draggingCommandID: FloatingCommand.ID?
    let onMove: (FloatingCommand.ID, FloatingCommand.ID, Bool) -> Void

    func dropEntered(info: DropInfo) {
        guard let draggingCommandID, draggingCommandID != targetID else { return }
        onMove(draggingCommandID, targetID, isPinnedSection)
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        DropProposal(operation: .move)
    }

    func performDrop(info: DropInfo) -> Bool {
        draggingCommandID = nil
        return true
    }
}
