import { PageHeader } from "@/components/layout/page-header";
import { OrderGrid } from "@/components/pipeline/order-grid";

export default function ActiveDeadlinesPage() {
  return (
    <>
      <PageHeader
        title="FO Deadline"
        description="Form order aktif untuk pemantauan prioritas produksi harian."
      />
      <OrderGrid status="active" />
    </>
  );
}
