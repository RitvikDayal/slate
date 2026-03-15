import { ListView } from "@/components/views/list-view";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListView listId={id} />;
}
