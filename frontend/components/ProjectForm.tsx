"use client";

import { useState } from "react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createProject } from "@/lib/api";


export default function ProjectForm() {
  const [name, setName] = useState("");


  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProject,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      setName("");
    },
});

  return (
    <>
      <input value={name} onChange={(e) => setName(e.target.value)}/>

      <button
        onClick={() => mutation.mutate(name)}
      >
        作成
      </button>
    </>
  );
}