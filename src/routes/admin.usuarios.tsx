import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Shield, ShieldOff, Trash2, UserPlus, Lock, Users, ClipboardPaste, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminBulkCreateUsers, adminUpdateUser, adminDeleteUser } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/usuarios")({
  component: Usuarios,
});

const SUPPORT_EMAIL = "suporte04@baeletrica.com";

interface User {
  id: string;
  nome: string;
  email: string;
  setor_id: string | null;
  role: string;
}

function Usuarios() {
  const createFn = useServerFn(adminCreateUser);
  const bulkCreateFn = useServerFn(adminBulkCreateUsers);
  const updateFn = useServerFn(adminUpdateUser);
  const deleteFn = useServerFn(adminDeleteUser);
  const [users, setUsers] = useState<User[]>([]);
  const [setores, setSetores] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "", setor_id: "none", isAdmin: false });
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSetorId, setBulkSetorId] = useState("none");
  const [bulkIsAdmin, setBulkIsAdmin] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ email: string; ok: boolean; error?: string }[] | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editForm, setEditForm] = useState<{ id: string; nome: string; email: string; password: string; setor_id: string; isAdmin: boolean }>({
    id: "", nome: "", email: "", password: "", setor_id: "none", isAdmin: false,
  });

  const carregar = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: sets }] = await Promise.all([
      supabase.from("profiles").select("id,nome,email,setor_id"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("setores").select("id,nome").order("nome"),
    ]);
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r: any) => {
      if (r.role === "admin" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
    });
    setUsers((profs ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.id) ?? "user" })));
    setSetores(sets ?? []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const atualizarSetor = async (id: string, setor_id: string | null) => {
    const { error } = await supabase.from("profiles").update({ setor_id }).eq("id", id);
    if (error) toast.error("Erro ao atualizar setor");
    else { toast.success("Setor atualizado"); carregar(); }
  };

  const toggleAdmin = async (u: User) => {
    if (u.email.toLowerCase() === SUPPORT_EMAIL && u.role === "admin") {
      toast.error("Conta de suporte é protegida.");
      return;
    }
    if (u.role === "admin") {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      if (error) toast.error("Erro: " + error.message);
      else { toast.success("Admin removido"); carregar(); }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
      if (error) toast.error("Erro: " + error.message);
      else { toast.success("Promovido a admin"); carregar(); }
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
    if (!form.nome?.trim() || !form.password) { toast.error("Nome e senha (mín. 6) obrigatórios"); return; }
    setBusy(true);
    try {
      await createFn({
        data: {
          nome: form.nome,
          email: form.email.trim() || undefined,
          password: form.password,
          setor_id: form.setor_id === "none" ? null : form.setor_id,
          isAdmin: form.isAdmin,
        },
      });
      toast.success("Usuário criado — login imediato disponível.");
      setOpenNew(false);
      setForm({ nome: "", email: "", password: "", setor_id: "none", isAdmin: false });
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar usuário");
    } finally {
      setBusy(false);
    }
  };

  const abrirEdicao = (u: User) => {
    setEditForm({
      id: u.id,
      nome: u.nome,
      email: u.email,
      password: "",
      setor_id: u.setor_id ?? "none",
      isAdmin: u.role === "admin",
    });
    setOpenEdit(true);
  };

  const salvarEdicao = async () => {
    if (!editForm.nome?.trim()) { toast.error("Nome obrigatório"); return; }
    setEditBusy(true);
    try {
      await updateFn({
        data: {
          userId: editForm.id,
          nome: editForm.nome.trim(),
          email: editForm.email.trim() || undefined,
          password: editForm.password || undefined,
          setor_id: editForm.setor_id === "none" ? null : editForm.setor_id,
          isAdmin: editForm.isAdmin,
        },
      });
      toast.success("Usuário atualizado com sucesso.");
      setOpenEdit(false);
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar usuário");
    } finally {
      setEditBusy(false);
    }
  };

  const parseBulkUsers = () => {
    const lines = bulkText.split("\n").filter((l) => l.trim());
    const users: { nome: string; email: string; password: string; setor_id?: string | null; isAdmin?: boolean }[] = [];
    for (const line of lines) {
      const parts = line.split(/[;,\t]+/).map((p) => p.trim());
      if (parts.length < 2) continue;
      const [nome, email, password] = parts;
      if (!nome || !email || !password) continue;
      users.push({
        nome,
        email,
        password,
        setor_id: bulkSetorId === "none" ? null : bulkSetorId,
        isAdmin: bulkIsAdmin,
      });
    }
    return users;
  };

  const criarEmLote = async () => {
    const users = parseBulkUsers();
    if (!users.length) { toast.error("Nenhum usuário válido encontrado. Use: nome;email;senha (um por linha)"); return; }
    setBulkBusy(true);
    setBulkResults(null);
    try {
      const results = await bulkCreateFn({ data: { users } });
      setBulkResults(results);
      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.filter((r) => !r.ok).length;
      if (okCount > 0) toast.success(`${okCount} usuário(s) criado(s) com sucesso.`);
      if (failCount > 0) toast.error(`${failCount} usuário(s) falharam.`);
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na criação em lote");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Novo usuário
        </Button>
        <Button variant="outline" onClick={() => setOpenBulk(true)}>
          <Users className="w-4 h-4 mr-2" /> Criar em lote
        </Button>
      </header>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">Setor</th>
                <th className="text-left px-4 py-3">Função</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const isSupport = u.email.toLowerCase() === SUPPORT_EMAIL;
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      {u.nome}
                      {isSupport && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={u.setor_id ?? "none"}
                        onValueChange={(v) => atualizarSetor(u.id, v === "none" ? null : v)}
                      >
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Sem setor —</SelectItem>
                          {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{u.role === "admin" ? "Administrador" : "Funcionário"}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="sm" variant="ghost" disabled={isSupport} onClick={() => abrirEdicao(u)}>
                        <Pencil className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" disabled={isSupport} onClick={() => toggleAdmin(u)}>
                        {u.role === "admin"
                          ? (<><ShieldOff className="w-4 h-4 mr-1" /> Remover admin</>)
                          : (<><Shield className="w-4 h-4 mr-1" /> Tornar admin</>)}
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
        )}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">E-mail (opcional — se vazio, é gerado automaticamente)</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Senha (mín. 6)</label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Setor</label>
              <Select value={form.setor_id} onValueChange={(v) => setForm({ ...form, setor_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem setor —</SelectItem>
                  {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
              Conceder acesso de administrador
            </label>
            <p className="text-xs text-muted-foreground">Conta ativada imediatamente, sem necessidade de e-mail de confirmação.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={criar} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">E-mail (opcional — se vazio, usa o atual)</label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nova senha (opcional, mín. 6)</label>
              <Input type="text" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Setor</label>
              <Select value={editForm.setor_id} onValueChange={(v) => setEditForm({ ...editForm, setor_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem setor —</SelectItem>
                  {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.isAdmin} onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })} />
              Conceder acesso de administrador
            </label>
            <p className="text-xs text-muted-foreground">Deixe a senha em branco para manter a atual.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={editBusy}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={editBusy}>
              {editBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openBulk} onOpenChange={setOpenBulk}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar usuários em lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">Formato: nome;email;senha (um por linha)</label>
              <textarea
                className="w-full h-40 mt-1 p-3 text-sm font-mono border border-border rounded-lg bg-background resize-y"
                placeholder={"João Silva;joaosilva@baeletrica.com.br;ba1234\nMaria Santos;mariasantos@baeletrica.com.br;ba5678"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Setor padrão (opcional)</label>
                <Select value={bulkSetorId} onValueChange={setBulkSetorId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem setor —</SelectItem>
                    {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={bulkIsAdmin} onChange={(e) => setBulkIsAdmin(e.target.checked)} />
                  Conceder acesso de administrador a todos
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cada linha deve conter: <strong>nome</strong>; <strong>email</strong>; <strong>senha</strong> (separados por ponto e vírgula, vírgula ou tab).
              O setor e a função de admin serão aplicados a todos os usuários da lista.
            </p>
            {bulkResults && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3 text-xs space-y-1">
                {bulkResults.map((r, i) => (
                  <div key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
                    {r.ok ? "✓" : "✗"} {r.email} — {r.ok ? "Criado" : r.error}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenBulk(false); setBulkResults(null); setBulkText(""); }} disabled={bulkBusy}>Fechar</Button>
            <Button onClick={criarEmLote} disabled={bulkBusy || !bulkText.trim()}>
              {bulkBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ClipboardPaste className="w-4 h-4 mr-2" /> Criar em lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

