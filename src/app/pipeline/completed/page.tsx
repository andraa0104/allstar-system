import { PageHeader } from "@/components/layout/page-header";
import { OrderGrid } from "@/components/pipeline/order-grid";

export default function CompletedArchivesPage() {
  return (
    <>
      <PageHeader
        title="FO Complete"
        description="Arsip form order selesai sebagai referensi histori produksi."
      />
      <OrderGrid status="completed" />
    </>
  );
}
