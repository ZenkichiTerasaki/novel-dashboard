"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/lib/api";

export default function ProjectList() {
  const query = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  console.log(query.error);

  if (query.isError) {
    return (
      <div>
        <p>Error!</p>
        <pre>{String(query.error)}</pre>
      </div>
    );
  }

  if (query.isPending) {
    return <p>Loading...</p>;
  }

  return (
    <>
      {query.data.map((project: any) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </>
  );
}