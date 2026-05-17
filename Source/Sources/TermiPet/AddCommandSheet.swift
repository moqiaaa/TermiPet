import SwiftUI
import TermiPetCore

struct NewCommandDraft: Equatable {
    var title = ""
    var summary = ""
    var text = ""

    var trimmedTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }
    var trimmedSummary: String { summary.trimmingCharacters(in: .whitespacesAndNewlines) }
    var trimmedText: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }
    var isValid: Bool { !trimmedTitle.isEmpty && !trimmedText.isEmpty }
}

enum MoveDirection {
    case up
    case down
}

struct AddCommandSheet: View {
    @Binding var draft: NewCommandDraft
    let onCancel: @MainActor () -> Void
    let onConfirm: @MainActor () -> Void
    var localizer: AppLocalizer = AppLocalizer()

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(localizer[.addCommandTitle])
                .font(.system(size: 17, weight: .bold))

            VStack(alignment: .leading, spacing: 6) {
                Text(localizer[.addCommandNameLabel])
                    .font(.system(size: 12, weight: .semibold))
                TextField(localizer[.addCommandNamePlaceholder], text: $draft.title)
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(localizer[.addCommandDescriptionLabel])
                    .font(.system(size: 12, weight: .semibold))
                TextField(localizer[.addCommandDescriptionPlaceholder], text: $draft.summary)
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(localizer[.addCommandContentLabel])
                    .font(.system(size: 12, weight: .semibold))
                TextEditor(text: $draft.text)
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .frame(height: 88)
                    .scrollContentBackground(.hidden)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.18), lineWidth: 0.8)
                    )
            }

            HStack {
                Spacer()
                Button(localizer[.addCommandCancel]) {
                    onCancel()
                }
                Button(localizer[.addCommandConfirm]) {
                    onConfirm()
                }
                .keyboardShortcut(.defaultAction)
                .disabled(!draft.isValid)
            }
        }
        .padding(18)
        .frame(width: 380)
    }
}
