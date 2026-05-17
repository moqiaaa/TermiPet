import TermiPetCore
import SwiftUI

struct LanguageTabView: View {
    @Binding var selectedLanguage: AppLanguage
    let localizer: AppLocalizer
    @State private var saveMessage = ""
    @Environment(\.appSkin) private var skin

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(localizer[.languageTitle])
                        .font(.system(size: 16, weight: .semibold))

                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(AppLanguage.allCases, id: \.self) { language in
                            Button {
                                selectedLanguage = language
                            } label: {
                                HStack {
                                    Image(systemName: selectedLanguage == language ? "checkmark.circle.fill" : "circle")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundStyle(selectedLanguage == language ? .blue : .secondary)

                                    Text(language.displayName)
                                        .font(.system(size: 14, weight: .medium))

                                    Spacer()
                                }
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .padding(.vertical, 6)
                            .padding(.horizontal, 10)
                            .background(
                                selectedLanguage == language
                                    ? Color.blue.opacity(0.1)
                                    : Color.clear,
                                in: RoundedRectangle(cornerRadius: 6)
                            )
                        }
                    }

                    Text(localizer[.languageRestartNote])
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(skin.settingsSecondaryTextColor)
                        .padding(.top, 8)
                }
                .padding(24)
            }

            HStack {
                Spacer()
                Button {
                    AppLanguageStore().save(selectedLanguage)
                    saveMessage = localizer[.saved]
                } label: {
                    Label(localizer[.saveConfig], systemImage: "checkmark.circle")
                }
                .keyboardShortcut(.defaultAction)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, saveMessage.isEmpty ? 18 : 8)

            if !saveMessage.isEmpty {
                HStack {
                    Spacer()
                    Text(saveMessage)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.green)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
