import { notFound } from "next/navigation";
import { AppError, getTask } from "@/lib/db";
import { currentIdentity } from "@/lib/demo-identity";
import { TaskEditor } from "@/components/task-editor";
export default async function EditTask({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await currentIdentity();
  let task;
  try {
    task = getTask((await params).id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  if (identity?.role !== "business" || task.businessId !== identity.id)
    notFound();
  return <TaskEditor key={task.id} initial={task} />;
}
