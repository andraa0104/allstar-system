import { PageHeader } from "@/components/layout/page-header";
import { OrderGrid } from "@/components/pipeline/order-grid";

export default function PendingInquiriesPage() {
  return (
    <>
      <PageHeader
        title="FO Outstanding"
        description="Form order yang masih menunggu tindak lanjut produksi."
      />
      <OrderGrid status="pending" />
    </>
  );
}
