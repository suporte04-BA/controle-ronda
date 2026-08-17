import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Shield,
  ShieldOff,
  Trash2,
  UserPlus,
  Lock,
  Camera,
  X,
  ImagePlus,
  Users,
  Copy,
  Check,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUser,
  adminBulkCreateUsers,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/usuarios")({
  component: Usuarios,
});

const SUPPORT_EMAIL = "suporte04@baeletrica.com.br";

interface User {
  id: string;
  nome: string;
  email: string;
  setor_id: string | null;
  role: string;
  foto_url: string | null;
}

function Usuarios() {
  const createFn = useServerFn(adminCreateUser);
  const deleteFn = useServerFn(adminDeleteUser);
  const [users, setUsers] = useState<User[]>([]);
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "", setor_id: "none" });
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const formFileRef = useRef<HTMLInputElement | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editingPreview, setEditingPreview] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<
    { nome: string; email: string; password: string; ok: boolean; error?: string }[] | null
  >(null);
  const bulkFn = useServerFn(adminBulkCreateUsers);
  const updateFn = useServerFn(adminUpdateUser);
  const [openEdit, setOpenEdit] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    nome: "",
    email: "",
    password: "",
    setor_id: "none",
    isAdmin: false,
  });

  const abrirEdicao = (u: User) => {
    setEditUser(u);
    setEditForm({
      nome: u.nome,
      email: u.email,
      password: "",
      setor_id: u.setor_id ?? "none",
      isAdmin: u.role === "admin",
    });
    setOpenEdit(true);
  };

  const salvarEdicao = async () => {
    if (!editUser) return;
    if (!editForm.nome?.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres.");
      return;
    }
    setEditBusy(true);
    try {
      await updateFn({
        data: {
          userId: editUser.id,
          nome: editForm.nome,
          email: editForm.email || undefined,
          password: editForm.password || undefined,
          setor_id: editForm.setor_id === "none" ? null : editForm.setor_id,
          isAdmin: editForm.isAdmin,
        },
      });
      toast.success("Usuário atualizado com sucesso.");
      setOpenEdit(false);
      setEditUser(null);
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar usuário.");
    } finally {
      setEditBusy(false);
    }
  };

  const BULK_USERS = [
    {
      nome: "Kallahan Maverick",
      setor_nome: "CD - GUARDAS",
      role: "user" as const,
      password: "ba3847",
    },
    {
      nome: "Éder Christiano",
      setor_nome: "CD - GUARDAS",
      role: "user" as const,
      password: "ba7291",
    },
    {
      nome: "Rosicleia Cardoso",
      setor_nome: "CD - GUARDAS",
      role: "user" as const,
      password: "ba5163",
    },
    {
      nome: "Joel Brilhante",
      setor_nome: "CD - GUARDAS",
      role: "user" as const,
      password: "ba8420",
    },
    {
      nome: "Marcos Vinicius",
      setor_nome: "CD - GUARDAS",
      role: "user" as const,
      password: "ba6059",
    },
    {
      nome: "Walison Bastos",
      setor_nome: "CD - GUARDAS",
      role: "user" as const,
      password: "ba4712",
    },
    { nome: "José Augusto", setor_nome: "CD - GUARDAS", role: "user" as const, password: "ba9385" },
    {
      nome: "Edson Farias",
      email: "edsonfarias@baeletrica.com.br",
      setor_nome: "GESTOR DE OPERAÇÕES",
      role: "admin" as const,
      password: "ba837291",
    },
    {
      nome: "Ricardo Gomes",
      email: "ricardogomes@baeletrica.com.br",
      setor_nome: "GESTOR DE OPERAÇÕES",
      role: "admin" as const,
      password: "ba461083",
    },
    {
      nome: "Marcelo Fonseca",
      email: "marcelofonseca@baeletrica.com.br",
      setor_nome: "GESTOR DE OPERAÇÕES",
      role: "admin" as const,
      password: "ba295746",
    },
    {
      nome: "Benjamin Marcos",
      email: "benjaminmarcos215@gmail.com",
      setor_nome: "GESTOR DE OPERAÇÕES",
      role: "admin" as const,
      password: "ba613804",
    },
  ];

  const gerarEmail = (nome: string) => {
    const slug = nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, ".");
    return `${slug}@baeletrica.com.br`;
  };

  const executarBulk = async () => {
    setBulkBusy(true);
    setBulkResults(null);
    try {
      const usuarios = BULK_USERS.map((u) => ({
        ...u,
        email: u.email ?? gerarEmail(u.nome),
        password: u.password,
      }));

      const result = await bulkFn({
        data: {
          setores: [{ nome: "CD - GUARDAS" }, { nome: "GESTOR DE OPERAÇÕES" }],
          usuarios,
        },
      });

      setBulkResults(result);
      const okCount = result.filter((r) => r.ok).length;
      const failCount = result.filter((r) => !r.ok).length;
      toast.success(
        `${okCount} usuário(s) criado(s) com sucesso${failCount ? `, ${failCount} falha(s)` : ""}`,
      );
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na criação em lote");
    } finally {
      setBulkBusy(false);
    }
  };

  const copyAllCredentials = () => {
    if (!bulkResults) return;
    const text = bulkResults
      .filter((r) => r.ok)
      .map((r) => `${r.nome} | ${r.email} | ${r.password}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Credenciais copiadas!");
  };

  const carregar = async () => {
    setLoading(true);
    try {
      const [{ data: profs }, { data: roles }, { data: sets }] = await Promise.all([
        supabase.from("profiles").select("id,nome,email,setor_id,foto_url"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("setores").select("id,nome").order("nome"),
      ]);
      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => {
        if (r.role === "admin" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
      });
      setUsers((profs ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "user" })));
      setSetores(sets ?? []);
    } catch (e: any) {
      console.error("Erro ao carregar usuários:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const atualizarSetor = async (id: string, setor_id: string | null) => {
    const { error } = await supabase.from("profiles").update({ setor_id }).eq("id", id);
    if (error) toast.error("Erro ao atualizar setor");
    else {
      toast.success("Setor atualizado");
      carregar();
    }
  };

  const toggleAdmin = async (u: User) => {
    if (u.email.toLowerCase() === SUPPORT_EMAIL && u.role === "admin") {
      toast.error("Conta de suporte é protegida.");
      return;
    }
    if (u.role === "admin") {
      const adminCount = users.filter((x) => x.role === "admin").length;
      if (adminCount <= 1) {
        toast.error("Não é possível remover o último administrador.");
        return;
      }
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", u.id)
        .eq("role", "admin");
      if (error) toast.error("Erro: " + error.message);
      else {
        toast.success("Admin removido");
        carregar();
      }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
      if (error) toast.error("Erro: " + error.message);
      else {
        toast.success("Promovido a admin");
        carregar();
      }
    }
  };

  const remover = async (u: User) => {
    if (u.email.toLowerCase() === SUPPORT_EMAIL) {
      toast.error("Conta de suporte é protegida.");
      return;
    }
    if (!confirm(`Excluir ${u.nome} (${u.email})? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteFn({ data: { userId: u.id } });
      toast.success("Usuário excluído");
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao excluir");
    }
  };

  const criar = async () => {
    if (!form.nome?.trim() || !form.password) {
      toast.error("Nome e senha (mín. 6) obrigatórios");
      return;
    }
    setBusy(true);
    try {
      await createFn({
        data: {
          nome: form.nome,
          email: form.email || undefined,
          password: form.password,
          setor_id: form.setor_id === "none" ? null : form.setor_id,
        },
      });
      toast.success("Usuário criado — login imediato disponível.");
      setOpenNew(false);
      setForm({ nome: "", email: "", password: "", setor_id: "none" });
      setFormFile(null);
      setFormPreview(null);
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar usuário");
    } finally {
      setBusy(false);
    }
  };

  const handleFormFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (formPreview) URL.revokeObjectURL(formPreview);
    setFormFile(file);
    setFormPreview(URL.createObjectURL(file));
  };

  const openEditPhoto = (userId: string, currentFotoUrl: string | null) => {
    if (editingPreview) URL.revokeObjectURL(editingPreview);
    setEditingPhoto(userId);
    setEditingFile(null);
    setEditingPreview(null);
  };

  const handleEditFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editingPreview) URL.revokeObjectURL(editingPreview);
    setEditingFile(file);
    setEditingPreview(URL.createObjectURL(file));
  };

  const saveEditPhoto = async () => {
    if (!editingPhoto || !editingFile) return;
    setUploadingPhoto(true);
    try {
      const path = `${editingPhoto}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, editingFile, { contentType: editingFile.type, upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ foto_url: path })
        .eq("id", editingPhoto);
      if (dbErr) throw dbErr;
      toast.success("Foto atualizada!");
      setEditingPhoto(null);
      carregar();
    } catch (err: any) {
      toast.error("Erro ao salvar foto", { description: err?.message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeEditPhoto = async (userId: string) => {
    setUploadingPhoto(true);
    try {
      const user = users.find((u) => u.id === userId);
      if (user?.foto_url) {
        const { error: storageErr } = await supabase.storage
          .from("avatars")
          .remove([user.foto_url]);
        if (storageErr) console.warn("Storage remove failed:", storageErr.message);
      }
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ foto_url: null })
        .eq("id", userId);
      if (dbErr) throw dbErr;
      toast.success("Foto removida!");
      setEditingPhoto(null);
      carregar();
    } catch (err: any) {
      toast.error("Erro ao remover foto", { description: err?.message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenBulk(true)}>
            <Users className="w-4 h-4 mr-2" /> Criação em Lote
          </Button>
          <Button onClick={() => setOpenNew(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Novo usuário
          </Button>
        </div>
      </header>

      <div className="card-neon overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Foto</th>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">E-mail</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Setor</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Função</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {users.map((u) => {
                  const isSupport = u.email.toLowerCase() === SUPPORT_EMAIL;
                  return (
                    <tr key={u.id} className="hover:bg-hover-subtle transition-colors">
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => openEditPhoto(u.id, u.foto_url)}
                        >
                          {u.foto_url ? (
                            <AvatarThumb userId={u.id} fotoUrl={u.foto_url} />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                              <Camera className="w-4 h-4" />
                            </div>
                          )}
                          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2 sm:hidden mb-1">
                          <div
                            className="relative group cursor-pointer"
                            onClick={() => openEditPhoto(u.id, u.foto_url)}
                          >
                            {u.foto_url ? (
                              <AvatarThumb userId={u.id} fotoUrl={u.foto_url} size="sm" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                <Camera className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                        {u.nome}
                        {isSupport && <Lock className="w-3.5 h-3.5 text-amber-600 inline ml-1" />}
                        <div className="text-xs text-muted-foreground md:hidden">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Select
                          value={u.setor_id ?? "none"}
                          onValueChange={(v) => atualizarSetor(u.id, v === "none" ? null : v)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sem setor —</SelectItem>
                            {setores.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-neon-pink/15 text-neon-pink border border-neon-pink/20"
                              : "bg-secondary/50 text-muted-foreground border border-border-subtle"
                          }`}
                        >
                          {u.role === "admin" ? "Administrador" : "Funcionário"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="sm:hidden"
                          onClick={() => openEditPhoto(u.id, u.foto_url)}
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSupport}
                          onClick={() => abrirEdicao(u)}
                          title="Editar usuário"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSupport && u.role === "admin"}
                          onClick={() => toggleAdmin(u)}
                        >
                          {u.role === "admin" ? (
                            <>
                              <ShieldOff className="w-4 h-4 mr-1" /> Remover admin
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-1" /> Tornar admin
                            </>
                          )}
                        </Button>
                        {!isSupport && (
                          <Button size="sm" variant="destructive" onClick={() => remover(u)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Excluir
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={openNew}
        onOpenChange={(open) => {
          setOpenNew(open);
          if (!open) {
            setForm({ nome: "", email: "", password: "", setor_id: "none" });
            setFormFile(null);
            setFormPreview(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label htmlFor="new-nome" className="text-xs text-muted-foreground">
                Nome
              </label>
              <Input
                id="new-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="new-email" className="text-xs text-muted-foreground">
                E-mail
              </label>
              <Input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="new-password" className="text-xs text-muted-foreground">
                Senha (mín. 6)
              </label>
              <Input
                id="new-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Setor</label>
              <Select
                value={form.setor_id}
                onValueChange={(v) => setForm({ ...form, setor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem setor —</SelectItem>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Foto (opcional)</label>
              <div className="flex items-center gap-3 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => formFileRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4 mr-2" /> Selecionar
                </Button>
                {formPreview && (
                  <img
                    src={formPreview}
                    alt="Preview"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
              </div>
              <input
                ref={formFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFormFile}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Conta ativada imediatamente, sem necessidade de e-mail de confirmação. Novos usuários
              recebem perfil de Funcionário.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={criar} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingPhoto}
        onOpenChange={() => {
          if (editingPreview) URL.revokeObjectURL(editingPreview);
          setEditingPhoto(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar foto do usuário</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {editingPreview ? (
              <img
                src={editingPreview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-primary/30"
              />
            ) : editingPhoto ? (
              <AvatarThumb
                userId={editingPhoto}
                fotoUrl={users.find((u) => u.id === editingPhoto)?.foto_url ?? null}
                size="lg"
              />
            ) : null}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditingFile(file);
                      setEditingPreview(URL.createObjectURL(file));
                    }
                  };
                  input.click();
                }}
              >
                <Camera className="w-4 h-4 mr-2" /> Trocar foto
              </Button>
              {users.find((u) => u.id === editingPhoto)?.foto_url && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => editingPhoto && removeEditPhoto(editingPhoto)}
                  disabled={uploadingPhoto}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remover
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhoto(null)}>
              Cancelar
            </Button>
            {editingFile && (
              <Button onClick={saveEditPhoto} disabled={uploadingPhoto}>
                {uploadingPhoto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Salvar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openBulk}
        onOpenChange={(open) => {
          setOpenBulk(open);
          if (!open) setBulkResults(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criação em Lote — Portaria CD + Gestores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Cria todos os usuários de uma vez. Setores <strong>CD - GUARDAS</strong> e{" "}
              <strong>GESTOR DE OPERAÇÕES</strong> serão criados automaticamente.
            </p>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Vigilantes (Portaria CD)
              </h4>
              {BULK_USERS.filter((u) => u.role === "user").map((u) => (
                <div
                  key={u.nome}
                  className="flex items-center gap-3 text-sm p-2 rounded-lg bg-secondary/30"
                >
                  <span className="font-medium">{u.nome}</span>
                  <span className="text-muted-foreground text-xs">
                    • {u.email ?? gerarEmail(u.nome)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Administradores (Gestores)
              </h4>
              {BULK_USERS.filter((u) => u.role === "admin").map((u) => (
                <div
                  key={u.nome}
                  className="flex items-center gap-3 text-sm p-2 rounded-lg bg-secondary/30"
                >
                  <span className="font-medium">{u.nome}</span>
                  <span className="text-muted-foreground text-xs">• {u.email}</span>
                </div>
              ))}
            </div>

            {bulkResults && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    Credenciais Geradas
                  </h4>
                  <Button size="sm" variant="outline" onClick={copyAllCredentials}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar todas
                  </Button>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-xs font-mono space-y-1 max-h-60 overflow-y-auto">
                  {bulkResults.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 ${r.ok ? "text-foreground" : "text-destructive"}`}
                    >
                      {r.ok ? (
                        <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                      )}
                      <span className="font-medium">{r.nome}</span>
                      <span className="text-muted-foreground">|</span>
                      <span>{r.email}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-neon-cyan font-bold">
                        {r.ok ? r.password : r.error}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBulk(false)} disabled={bulkBusy}>
              Fechar
            </Button>
            {!bulkResults && (
              <Button onClick={executarBulk} disabled={bulkBusy}>
                {bulkBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar todos
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openEdit}
        onOpenChange={(open) => {
          setOpenEdit(open);
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-3 py-2">
              <div>
                <label htmlFor="edit-nome" className="text-xs text-muted-foreground">
                  Nome
                </label>
                <Input
                  id="edit-nome"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="text-xs text-muted-foreground">
                  E-mail (opcional — se vazio, mantém o atual)
                </label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="edit-password" className="text-xs text-muted-foreground">
                  Nova senha (opcional, mín. 6)
                </label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Setor</label>
                <Select
                  value={editForm.setor_id}
                  onValueChange={(v) => setEditForm({ ...editForm, setor_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem setor —</SelectItem>
                    {setores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.isAdmin}
                  onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                />
                Administrador
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={editBusy}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao} disabled={editBusy}>
              {editBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AvatarThumb({
  userId,
  fotoUrl,
  size = "md",
}: {
  userId: string;
  fotoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const sizeClasses = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-20 h-20" };

  useEffect(() => {
    if (!fotoUrl) return;
    supabase.storage
      .from("avatars")
      .createSignedUrl(fotoUrl, 3600)
      .then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
  }, [fotoUrl]);

  if (!signedUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-secondary flex items-center justify-center text-muted-foreground`}
      >
        <Camera className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt="Avatar"
      className={`${sizeClasses[size]} rounded-full object-cover border border-border-subtle`}
    />
  );
}
