import { WalletPageContent } from "@/app/providers/[providerId]/wallet/[address]/WalletPageContent";

export const dynamic = "force-static";
export const revalidate = 10800;

export default async function WalletAliasPage({
  params,
}: {
  params: Promise<{ providerId: string; address: string }>;
}) {
  const { providerId, address } = await params;
  return (
    <WalletPageContent
      providerId={providerId}
      address={address}
      walletHrefPrefix={`/${providerId}/wallet`}
    />
  );
}
