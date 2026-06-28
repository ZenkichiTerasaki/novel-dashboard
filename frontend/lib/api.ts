const API_URL = "http://localhost:3000";

export async function getProjects() {
  const res = await fetch(`${API_URL}/projects`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }

  return res.json();
}

export async function createProject(name: string) {
  const res = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed");
  }

  return res.json();
}