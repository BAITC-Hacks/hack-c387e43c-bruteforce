import { currentIdentity } from "@/lib/demo-identity";
import { TaskEditor } from "@/components/task-editor";
export default async function NewTask() {
  if ((await currentIdentity())?.role !== "business")
    return (
      <section className="panel empty">
        <h1>A business starts the brief</h1>
        <p>Choose a business in the demo identity selector to create a task.</p>
      </section>
    );
  return <TaskEditor />;
}
