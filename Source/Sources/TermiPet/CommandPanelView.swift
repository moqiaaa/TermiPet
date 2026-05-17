import TermiPetCore
import SwiftUI

struct CommandPanelView: View {
    let commands: [FloatingCommand]
    let isPinned: Bool
    let onTogglePinned: @MainActor () -> Void
    let onAddCommandRequested: @MainActor () -> Void
    let onDeleteCommand: @MainActor (FloatingCommand) -> Void
    let onMoveCommand: @MainActor (FloatingCommand.ID, MoveDirection) -> Void
    let onCommandSelected: @MainActor (FloatingCommand) -> Void
    let onResizeHeight: @MainActor (CGFloat) -> Void
    let localizer: AppLocalizer

    private var commandColumns: [GridItem] {
        [
            GridItem(.flexible(minimum: 100), spacing: 6),
            GridItem(.flexible(minimum: 100), spacing: 6),
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                Label(localizer[.commandPanelTitle], systemImage: "terminal.fill")
                    .font(.system(size: 14, weight: .bold))
                Spacer()
                Text("\(commands.count)")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(.secondary)
                Button {
                    onAddCommandRequested()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(width: 26, height: 26)
                        .background(Color.primary.opacity(0.06), in: Circle())
                        .contentShape(Circle())
                }
                .buttonStyle(PressableScaleButtonStyle())
                .help(localizer[.commandPanelAdd])
                Button {
                    onTogglePinned()
                } label: {
                    Image(systemName: isPinned ? "pin.fill" : "pin")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(width: 26, height: 26)
                        .background(isPinned ? Color.accentColor.opacity(0.16) : Color.primary.opacity(0.06), in: Circle())
                        .foregroundStyle(isPinned ? Color.accentColor : Color.primary)
                        .contentShape(Circle())
                }
                .buttonStyle(PressableScaleButtonStyle())
                .help(isPinned ? localizer[.commandPanelUnpin] : localizer[.commandPanelPin])
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(.thinMaterial.opacity(0.86))
            .overlay(alignment: .leading) {
                PanelDragHandle()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.trailing, CommandPanelLayout.dragHandleTrailingPadding)
            }

            ScrollView {
                LazyVGrid(columns: commandColumns, alignment: .leading, spacing: 6) {
                    ForEach(commands) { command in
                        Button {
                            onCommandSelected(command)
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(command.title)
                                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                    .lineLimit(1)
                                    .truncationMode(.middle)

                                let localizedSummary = command.localizedSummary(localizer)
                                if !localizedSummary.isEmpty {
                                    Text(localizedSummary)
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(Color.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .strokeBorder(Color.white.opacity(0.12), lineWidth: 0.6)
                            )
                        }
                        .buttonStyle(PressableScaleButtonStyle())
                        .contextMenu {
                            Button(localizer[.commandMoveUp]) {
                                onMoveCommand(command.id, .up)
                            }
                            Button(localizer[.commandMoveDown]) {
                                onMoveCommand(command.id, .down)
                            }
                            if command.isCustom {
                                Divider()
                                Button(role: .destructive) {
                                    onDeleteCommand(command)
                                } label: {
                                    Label(localizer[.commandsDelete], systemImage: "trash")
                                }
                            }
                        }
                    }
                }
                .padding(10)
            }
        }
        .frame(minWidth: 360, idealWidth: 360, maxWidth: 360, minHeight: 260)
        .glassPanel(cornerRadius: 16, shadowRadius: 20, shadowY: 9)
        .overlay(alignment: .bottomTrailing) {
            ResizeHandleView(onDragChanged: onResizeHeight)
                .frame(width: 24, height: 24)
                .padding(4)
                .overlay(alignment: .bottomTrailing) {
                    Image(systemName: "line.3.horizontal")
                        .font(.system(size: 9, weight: .bold))
                        .rotationEffect(.degrees(-45))
                        .foregroundStyle(.secondary.opacity(0.85))
                        .padding(.trailing, 5)
                        .padding(.bottom, 5)
                        .allowsHitTesting(false)
                }
        }
    }
}
