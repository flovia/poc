import { WalletPageContent } from "./WalletPageContent";

export const dynamic = "force-static";
export const revalidate = 10800;

export default async function WalletPage({
  params,
}: {
  params: Promise<{ providerId: string; address: string }>;
}) {
  const { providerId, address } = await params;
  return (
    <WalletPageContent
      providerId={providerId}
      address={address}
      walletHrefPrefix={`/providers/${providerId}/wallet`}
    />
  );
}
