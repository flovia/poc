import Link from "next/link";
import { TopBar } from "@/components/shell/TopBar";
import { WalletScreen } from "@/components/wallet/WalletScreen";
import { getCustomerProfile } from "@/lib/api/client";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ providerId: string; address: string }>;
}) {
  const { providerId, address } = await params;
  const decoded = decodeURIComponent(address);
  const profile = await getCustomerProfile(decoded);

  if (!profile) {
    return (
      <>
        <TopBar
          providerId={providerId}
          crumbs={[
            { label: "Customers", href: `/providers/${providerId}/customers` },
            { label: decoded },
          ]}
        />
        <div className="scroll">
          <div style={{ padding: "40px", color: "var(--text-2)" }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Wallet not found</h1>
            <p style={{ marginBottom: 16, color: "var(--text-3)", fontSize: 13 }}>
              The BFF returned 404 for this address. It may not appear in the current customer
              projection.
            </p>
            <p>
              <Link href={`/providers/${providerId}/customers`} style={{ color: "var(--mesh-blue)" }}>
                Back to customers
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        providerId={providerId}
        crumbs={[
          { label: "Customers", href: `/providers/${providerId}/customers` },
          { label: decoded },
        ]}
      />
      <div className="scroll">
        <WalletScreen profile={profile} providerId={providerId} />
      </div>
    </>
  );
}
