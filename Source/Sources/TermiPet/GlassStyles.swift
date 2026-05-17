import TermiPetCore
import SwiftUI

private struct AppSkinEnvironmentKey: EnvironmentKey {
    static let defaultValue: AppSkin = .glass
}

extension EnvironmentValues {
    var appSkin: AppSkin {
        get { self[AppSkinEnvironmentKey.self] }
        set { self[AppSkinEnvironmentKey.self] = newValue }
    }
}

extension AppSkin {
    var settingsPrimaryTextColor: Color {
        switch self {
        case .glass: Color.white.opacity(0.96)
        case .dark: .primary
        case .pixel: Color(red: 1.0, green: 0.94, blue: 0.74)
        }
    }

    var settingsSecondaryTextColor: Color {
        switch self {
        case .glass: Color.white.opacity(0.74)
        case .dark: .secondary
        case .pixel: Color(red: 1.0, green: 0.88, blue: 0.58).opacity(0.82)
        }
    }

    var settingsTertiaryTextColor: Color {
        switch self {
        case .glass: Color.white.opacity(0.56)
        case .dark: Color.secondary.opacity(0.72)
        case .pixel: Color(red: 1.0, green: 0.88, blue: 0.58).opacity(0.62)
        }
    }

    var settingsSeparatorColor: Color {
        switch self {
        case .glass: Color.white.opacity(0.18)
        case .dark: Color.primary.opacity(0.12)
        case .pixel: Color(red: 0.99, green: 0.78, blue: 0.28).opacity(0.34)
        }
    }

    var settingsSubtleFillColor: Color {
        switch self {
        case .glass: Color.white.opacity(0.08)
        case .dark: Color.primary.opacity(0.045)
        case .pixel: Color(red: 0.08, green: 0.12, blue: 0.20).opacity(0.92)
        }
    }

    var settingsSubtleStrokeColor: Color {
        switch self {
        case .glass: Color.white.opacity(0.20)
        case .dark: Color.primary.opacity(0.10)
        case .pixel: Color(red: 0.99, green: 0.78, blue: 0.28).opacity(0.75)
        }
    }
}

struct GlassPanelModifier: ViewModifier {
    @Environment(\.appSkin) private var skin
    var cornerRadius: CGFloat = 16
    var shadowRadius: CGFloat = 18
    var shadowY: CGFloat = 8

    func body(content: Content) -> some View {
        content
            .background(panelBackground, in: RoundedRectangle(cornerRadius: radius, style: style))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: style)
                    .strokeBorder(
                        borderGradient,
                        lineWidth: skin == .pixel ? 2 : 0.9
                    )
            )
            .overlay(pixelInset)
            .foregroundStyle(contentForeground)
            .shadow(color: shadowColor, radius: skin == .pixel ? 0 : shadowRadius, x: skin == .pixel ? 4 : 0, y: skin == .pixel ? 4 : shadowY)
    }

    private var radius: CGFloat { skin == .pixel ? 0 : cornerRadius }
    private var style: RoundedCornerStyle { skin == .pixel ? .circular : .continuous }
    private var panelBackground: some ShapeStyle {
        switch skin {
        case .glass:
            return AnyShapeStyle(.ultraThinMaterial)
        case .dark:
            return AnyShapeStyle(Color(red: 0.04, green: 0.045, blue: 0.05).opacity(0.96))
        case .pixel:
            return AnyShapeStyle(
                LinearGradient(
                    colors: [
                        Color(red: 0.07, green: 0.10, blue: 0.18),
                        Color(red: 0.05, green: 0.15, blue: 0.17),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
        }
    }
    private var borderGradient: LinearGradient {
        switch skin {
        case .glass:
            LinearGradient(
                colors: [Color.white.opacity(0.34), Color.white.opacity(0.10), Color.black.opacity(0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .dark:
            LinearGradient(colors: [Color.white.opacity(0.20), Color.white.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .pixel:
            LinearGradient(
                colors: [
                    Color(red: 0.99, green: 0.78, blue: 0.28),
                    Color(red: 0.36, green: 0.86, blue: 0.78),
                    Color(red: 0.02, green: 0.04, blue: 0.09),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
    private var shadowColor: Color {
        switch skin {
        case .glass: Color.black.opacity(0.18)
        case .dark: Color.black.opacity(0.38)
        case .pixel: Color(red: 0.01, green: 0.02, blue: 0.05).opacity(0.86)
        }
    }

    @ViewBuilder
    private var pixelInset: some View {
        if skin == .pixel {
            RoundedRectangle(cornerRadius: 0)
                .strokeBorder(Color(red: 0.99, green: 0.94, blue: 0.68).opacity(0.20), lineWidth: 1)
                .padding(3)
        }
    }

    private var contentForeground: Color {
        switch skin {
        case .glass, .dark: .primary
        case .pixel: Color(red: 1.0, green: 0.94, blue: 0.74)
        }
    }
}

struct GlassCapsuleModifier: ViewModifier {
    @Environment(\.appSkin) private var skin

    func body(content: Content) -> some View {
        content
            .background(background, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: skin == .pixel ? 2 : 0.9)
            )
            .foregroundStyle(contentForeground)
            .shadow(color: shadowColor, radius: skin == .pixel ? 0 : 14, x: skin == .pixel ? 3 : 0, y: skin == .pixel ? 3 : 5)
    }

    private var background: some ShapeStyle {
        switch skin {
        case .glass: AnyShapeStyle(.ultraThinMaterial)
        case .dark: AnyShapeStyle(Color(red: 0.045, green: 0.05, blue: 0.06).opacity(0.98))
        case .pixel: AnyShapeStyle(Color(red: 0.08, green: 0.12, blue: 0.21).opacity(0.98))
        }
    }

    private var borderColor: Color {
        switch skin {
        case .glass: Color.white.opacity(0.28)
        case .dark: Color.white.opacity(0.16)
        case .pixel: Color(red: 0.99, green: 0.78, blue: 0.28)
        }
    }

    private var shadowColor: Color {
        switch skin {
        case .glass: Color.black.opacity(0.16)
        case .dark: Color.black.opacity(0.38)
        case .pixel: Color(red: 0.01, green: 0.02, blue: 0.05).opacity(0.86)
        }
    }

    private var radius: CGFloat { skin == .pixel ? 0 : 999 }

    private var contentForeground: Color {
        switch skin {
        case .glass, .dark: .primary
        case .pixel: Color(red: 1.0, green: 0.94, blue: 0.74)
        }
    }
}

struct GlassIconButtonModifier: ViewModifier {
    @Environment(\.appSkin) private var skin
    var isActive = false

    func body(content: Content) -> some View {
        content
            .foregroundStyle(foreground)
            .frame(width: AppSkin.toolbarIconSlotSize, height: AppSkin.toolbarIconSlotSize)
            .background(background, in: Circle())
            .shadow(color: activeGlowColor, radius: isActive && skin != .pixel ? 7 : 0, y: isActive && skin != .pixel ? 2 : 0)
            .offset(y: isActive && skin != .pixel ? -1 : 0)
            .overlay(
                Circle()
                    .strokeBorder(border, lineWidth: skin == .pixel ? 1.1 : 0.8)
            )
            .contentShape(Circle())
    }

    private var foreground: Color {
        if isActive {
            return skin == .pixel ? Color(red: 0.05, green: 0.08, blue: 0.14) : .primary
        }
        switch skin {
        case .glass: return .primary
        case .dark: return .white.opacity(0.92)
        case .pixel: return Color(red: 1.0, green: 0.94, blue: 0.74)
        }
    }

    private var background: some ShapeStyle {
        if isActive {
            switch skin {
            case .glass:
                return AnyShapeStyle(.regularMaterial)
            case .dark:
                return AnyShapeStyle(Color.white.opacity(0.16))
            case .pixel:
                return AnyShapeStyle(Color(red: 0.99, green: 0.76, blue: 0.26))
            }
        }
        switch skin {
        case .glass, .dark, .pixel: return AnyShapeStyle(Color.clear)
        }
    }

    private var border: Color {
        if isActive {
            return skin == .pixel ? Color(red: 1.0, green: 0.94, blue: 0.74) : Color.white.opacity(skin == .dark ? 0.30 : 0.42)
        }
        switch skin {
        case .glass, .dark, .pixel: return Color.clear
        }
    }

    private var activeGlowColor: Color {
        switch skin {
        case .glass:
            return Color.white.opacity(0.20)
        case .dark:
            return Color.white.opacity(0.10)
        case .pixel:
            return Color.clear
        }
    }
}

extension View {
    func glassPanel(cornerRadius: CGFloat = 16, shadowRadius: CGFloat = 18, shadowY: CGFloat = 8) -> some View {
        modifier(GlassPanelModifier(cornerRadius: cornerRadius, shadowRadius: shadowRadius, shadowY: shadowY))
    }

    func glassCapsule() -> some View {
        modifier(GlassCapsuleModifier())
    }

    func glassIconButton(isActive: Bool = false) -> some View {
        modifier(GlassIconButtonModifier(isActive: isActive))
    }

    func appSkin(_ skin: AppSkin) -> some View {
        environment(\.appSkin, skin)
    }
}

struct PressableScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1.0)
            .animation(.spring(response: 0.22, dampingFraction: 0.72), value: configuration.isPressed)
    }
}
