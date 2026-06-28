import ProjectForm from "@/components/ProjectForm";
import ProjectList from "@/components/ProjectList";

export default function Home() {
  return (
    <main className="p-8">
      <h1>Novel Dashboard</h1>

      <ProjectForm />

      <ProjectList />
    </main>
  );
}