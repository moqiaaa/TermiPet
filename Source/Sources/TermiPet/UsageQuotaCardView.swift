import TermiPetCore
import SwiftUI

struct UsageQuotaCardView: View {
    @ObservedObject var store: UsageQuotaStore
    let localizer: AppLocalizer
    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            header

            ForEach(Array(AIService.allCases.enumerated()), id: \.element) { index, service in
                serviceSection(service)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)
                    .animation(.spring(response: 0.34, dampingFraction: 0.82).delay(Double(index) * 0.045), value: appeared)
            }
        }
        .padding(.horizontal, UsageQuotaLayout.horizontalPadding)
        .padding(.vertical, 10)
        .frame(width: UsageQuotaLayout.panelWidth, alignment: .leading)
        .glassPanel(cornerRadius: 16, shadowRadius: 16, shadowY: 7)
        .onAppear { appeared = true }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(headerColor)
                .frame(width: 8, height: 8)

            Text(localizer[.quotaTitle])
                .font(.system(size: 13, weight: .bold))

            Spacer()

            Button {
                Task { await store.refreshIfStale(force: true) }
            } label: {
                Image(systemName: store.isRefreshing ? "arrow.triangle.2.circlepath" : "arrow.clockwise")
                    .font(.system(size: 11, weight: .bold))
                    .rotationEffect(store.isRefreshing ? .degrees(360) : .degrees(0))
                    .animation(store.isRefreshing ? .linear(duration: 0.8).repeatForever(autoreverses: false) : .default, value: store.isRefreshing)
            }
            .buttonStyle(PressableScaleButtonStyle())
            .disabled(store.isRefreshing)
            .help(localizer[.quotaRefresh])
        }
    }

    private var headerColor: Color {
        if store.isRefreshing { return .blue }
        if store.quotas.values.contains(where: { $0.status == .valid && !$0.tiers.isEmpty }) { return .green }
        return .secondary
    }

    @ViewBuilder
    private func serviceSection(_ service: AIService) -> some View {
        let quota = store.quotas[service]
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: UsageQuotaLayout.rowSpacing) {
                Text(service.displayName)
                    .font(.system(size: 12, weight: .bold))
                    .lineLimit(1)
                    .frame(width: UsageQuotaLayout.serviceNameWidth, alignment: .leading)

                Spacer(minLength: 0)

                Text(statusText(for: quota))
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(statusColor(for: quota))
                    .frame(width: UsageQuotaLayout.statusWidth, alignment: .trailing)
            }

            if let quota, quota.status == .valid, !quota.tiers.isEmpty {
                ForEach(quota.tiers, id: \.windowLabel) { tier in
                    HStack(spacing: UsageQuotaLayout.rowSpacing) {
                        Spacer()
                            .frame(width: UsageQuotaLayout.detailIndent)
                        compactTierRow(tier)
                    }
                }
            } else {
                HStack(spacing: UsageQuotaLayout.rowSpacing) {
                    Spacer()
                        .frame(width: UsageQuotaLayout.detailIndent)
                    Text(emptyText(for: quota))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
            }
        }
    }

    private func compactTierRow(_ tier: QuotaTier) -> some View {
        HStack(spacing: UsageQuotaLayout.rowSpacing) {
            Text(tier.windowLabel)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .frame(width: UsageQuotaLayout.tierLabelWidth, alignment: .leading)

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.primary.opacity(0.12))
                    Capsule()
                        .fill(utilizationColor(tier.utilization))
                        .frame(width: geometry.size.width * min(max(tier.utilization, 0), 100) / 100)
                        .animation(.spring(response: 0.42, dampingFraction: 0.78), value: tier.utilization)
                }
            }
            .frame(width: UsageQuotaLayout.progressWidth, height: 5)

            Text("\(Int(tier.utilization.rounded()))%")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(utilizationColor(tier.utilization))
                .lineLimit(1)
                .frame(width: UsageQuotaLayout.percentWidth, alignment: .trailing)

            Text(tier.resetsAt.map { UsageQuotaFormatter.countdown(until: $0, resetText: localizer[.quotaReset]) } ?? "--")
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .frame(width: UsageQuotaLayout.countdownWidth, alignment: .trailing)
        }
    }

    private func tierRow(_ tier: QuotaTier) -> some View {
        HStack(spacing: 6) {
            Text(tier.windowLabel)
                .font(.system(size: 11, weight: .medium))
                .frame(width: 58, alignment: .leading)

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.primary.opacity(0.12))
                    Capsule()
                        .fill(utilizationColor(tier.utilization))
                        .frame(width: geometry.size.width * min(max(tier.utilization, 0), 100) / 100)
                }
            }
            .frame(height: 6)

            Text("\(Int(tier.utilization.rounded()))%")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(utilizationColor(tier.utilization))
                .frame(width: 32, alignment: .trailing)

            if let resetsAt = tier.resetsAt {
                Text(UsageQuotaFormatter.countdown(until: resetsAt, resetText: localizer[.quotaReset]))
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .frame(width: 42, alignment: .trailing)
            }
        }
    }

    private func statusText(for quota: ServiceQuota?) -> String {
        guard let quota else { return store.isRefreshing ? localizer[.quotaReading] : localizer[.quotaPending] }
        switch quota.status {
        case .valid:
            return quota.tiers.isEmpty ? localizer[.quotaNoData] : localizer[.quotaSynced]
        case .expired:
            return localizer[.quotaLoginRequired]
        case .notFound:
            return localizer[.quotaNotLoggedIn]
        case .parseError:
            return localizer[.quotaError]
        }
    }

    private func emptyText(for quota: ServiceQuota?) -> String {
        guard let quota else { return store.isRefreshing ? localizer[.quotaReadingDetail] : localizer[.quotaHoverDetail] }
        return quota.errorMessage ?? localizer[.quotaEmptyDetail]
    }

    private func statusColor(for quota: ServiceQuota?) -> Color {
        guard let quota else { return store.isRefreshing ? .blue : .secondary }
        switch quota.status {
        case .valid:
            return quota.tiers.isEmpty ? .secondary : .green
        case .expired:
            return .orange
        case .notFound:
            return .secondary
        case .parseError:
            return .red
        }
    }

    private func utilizationColor(_ utilization: Double) -> Color {
        if utilization >= 90 { return .red }
        if utilization >= 70 { return .orange }
        return .green
    }
}

private extension AIService {
    var displayName: String {
        switch self {
        case .claudeCode:
            "Claude Code"
        case .codex:
            "Codex"
        case .copilot:
            "GitHub Copilot"
        }
    }
}
