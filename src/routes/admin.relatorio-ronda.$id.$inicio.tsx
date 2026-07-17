import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/relatorio-ronda/$id/$inicio")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/admin/ronda-detalhe/$id/$inicio",
      params: { id: params.id, inicio: params.inicio },
    });
  },
});
