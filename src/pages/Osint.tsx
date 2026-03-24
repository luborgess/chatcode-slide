import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { generateChatResponse, ChatMessage } from "@/services/openai";
import { prepareOsintMessages } from "@/services/osintContext";
import { searchUsernameSmart, UsernameSearchProgress, SiteResult } from "@/services/usernameSearch";
import {
  Search, Shield, Download, Copy, ArrowLeft, Loader2, User, Globe,
  Briefcase, AlertTriangle, AtSign, CheckCircle2, XCircle, AlertCircle,
  ExternalLink, UserSearch
} from "lucide-react";
import { Link } from "react-router-dom";

type TabType = "name" | "username";

const Osint = () => {
  const [activeTab, setActiveTab] = useState<TabType>("name");

  // Name search state
  const [name, setName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<{ name: string; timestamp: string; type: TabType }[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  // Username search state
  const [username, setUsername] = useState("");
  const [isSearchingUsername, setIsSearchingUsername] = useState(false);
  const [usernameProgress, setUsernameProgress] = useState<UsernameSearchProgress | null>(null);
  const [usernameResults, setUsernameResults] = useState<SiteResult[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleNameSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      toast.error("Insira sua chave da API DeepSeek primeiro");
      return;
    }
    if (!name.trim()) {
      toast.error("Insira um nome para pesquisar");
      return;
    }

    setIsLoading(true);
    setReport(null);

    try {
      const messages = prepareOsintMessages(name.trim(), additionalContext.trim() || undefined);
      const response = await generateChatResponse(messages, apiKey, true);
      setReport(response);
      setSearchHistory(prev => [
        { name: name.trim(), timestamp: new Date().toLocaleString(), type: "name" },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error("OSINT search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Insira um username para pesquisar");
      return;
    }

    setIsSearchingUsername(true);
    setUsernameResults(null);
    setUsernameProgress(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const results = await searchUsernameSmart(
        username.trim(),
        (progress) => setUsernameProgress(progress),
        controller.signal
      );
      setUsernameResults(results);
      setSearchHistory(prev => [
        { name: `@${username.trim()}`, timestamp: new Date().toLocaleString(), type: "username" },
        ...prev.slice(0, 9)
      ]);
      const foundCount = results.filter(r => r.status === "found").length;
      toast.success(`Scan concluído! ${foundCount} perfis encontrados`);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Username search error:", error);
        toast.error("Erro na busca de username");
      }
    } finally {
      setIsSearchingUsername(false);
      abortControllerRef.current = null;
    }
  };

  const cancelUsernameSearch = () => {
    abortControllerRef.current?.abort();
    setIsSearchingUsername(false);
    toast.info("Busca cancelada");
  };

  const copyReport = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      toast.success("Relatório copiado!");
    }
  };

  const downloadReport = () => {
    if (report) {
      const blob = new Blob([report], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `osint-report-${name.replace(/\s+/g, "-").toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download iniciado!");
    }
  };

  const exportUsernameResults = () => {
    if (!usernameResults) return;
    const found = usernameResults.filter(r => r.status === "found");
    const content = [
      `# Username OSINT Report: @${username}`,
      `> Generated: ${new Date().toLocaleString()}`,
      `> Total sites checked: ${usernameResults.length}`,
      `> Profiles found: ${found.length}`,
      "",
      "## Found Profiles",
      "",
      ...found.map(r => `- **${r.name}** (${r.category}): ${r.url}`),
      "",
      "---",
      "*Report generated by OSINTPro - Blackbird Module*"
    ].join("\n");

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `username-osint-${username}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) {
        return <h2 key={i} className="text-xl font-bold text-emerald-400 mt-6 mb-3 flex items-center gap-2">{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-lg font-semibold text-emerald-300/80 mt-4 mb-2">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("- ")) {
        return <li key={i} className="ml-4 text-foreground/80 mb-1 list-disc">{line.replace("- ", "")}</li>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-bold text-foreground mt-2">{line.replace(/\*\*/g, "")}</p>;
      }
      if (line.trim() === "") {
        return <br key={i} />;
      }
      return <p key={i} className="text-foreground/70 mb-1">{line}</p>;
    });
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      social: "text-blue-400 bg-blue-400/10 border-blue-400/20",
      coding: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      gaming: "text-purple-400 bg-purple-400/10 border-purple-400/20",
      music: "text-pink-400 bg-pink-400/10 border-pink-400/20",
      photography: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    };
    return colors[cat] || "text-muted-foreground bg-muted/10 border-border/20";
  };

  const foundResults = usernameResults?.filter(r => r.status === "found") || [];
  const notFoundResults = usernameResults?.filter(r => r.status === "not_found") || [];
  const errorResults = usernameResults?.filter(r => r.status === "error") || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">OSINT<span className="text-emerald-400">Pro</span></h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("name")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "name"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Nome
            </button>
            <button
              onClick={() => setActiveTab("username")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "username"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AtSign className="h-3.5 w-3.5" />
              Username
            </button>
          </div>

          <div className="w-72">
            <Input
              type="password"
              placeholder="DeepSeek API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-8 text-xs bg-secondary/50 border-border/50"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {activeTab === "name" ? (
              /* Name Search Form */
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                  <form onSubmit={handleNameSearch} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome do Alvo</label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: John Doe"
                          className="pl-9 bg-secondary/50 border-border/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contexto Adicional</label>
                      <Input
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        placeholder="Empresa, cidade, cargo..."
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Iniciar Investigação
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              /* Username Search Form */
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                  <form onSubmit={handleUsernameSearch} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Username do Alvo
                      </label>
                      <div className="relative">
                        <AtSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Ex: johndoe123"
                          className="pl-9 bg-secondary/50 border-border/50"
                          disabled={isSearchingUsername}
                        />
                      </div>
                    </div>

                    {isSearchingUsername ? (
                      <Button
                        type="button"
                        onClick={cancelUsernameSearch}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancelar Scan
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <UserSearch className="h-4 w-4" />
                        Blackbird Scan
                      </Button>
                    )}
                  </form>

                  {/* Progress */}
                  {usernameProgress && isSearchingUsername && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{usernameProgress.checked}/{usernameProgress.total} sites</span>
                        <span className="text-emerald-400">{usernameProgress.found} encontrados</span>
                      </div>
                      <Progress
                        value={(usernameProgress.checked / usernameProgress.total) * 100}
                        className="h-1.5"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Modules */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos Ativos</h3>
                <div className="space-y-2">
                  {[
                    { icon: Globe, label: "Digital Footprint", color: "text-blue-400" },
                    { icon: Briefcase, label: "Professional Intel", color: "text-purple-400" },
                    { icon: Search, label: "Public Records", color: "text-amber-400" },
                    { icon: AlertTriangle, label: "Risk Assessment", color: "text-red-400" },
                    { icon: AtSign, label: "Blackbird Username", color: "text-emerald-400" },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      <div className={`h-2 w-2 rounded-full ${color.replace("text-", "bg-")}`} />
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      <span className="text-foreground/70">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico</h3>
                  <div className="space-y-2">
                    {searchHistory.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (item.type === "username") {
                            setUsername(item.name.replace("@", ""));
                            setActiveTab("username");
                          } else {
                            setName(item.name);
                            setActiveTab("name");
                          }
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {item.type === "username" ? (
                            <AtSign className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <User className="h-3 w-3 text-blue-400" />
                          )}
                          <span className="text-sm font-medium text-foreground/80">{item.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-5">{item.timestamp}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* NAME TAB CONTENT */}
            {activeTab === "name" && (
              <>
                {!report && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                      <Shield className="h-10 w-10 text-emerald-500/50" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground/80 mb-2">OSINT Intelligence Platform</h2>
                    <p className="text-muted-foreground max-w-md">
                      Insira um nome no painel lateral para iniciar uma investigação de inteligência de código aberto powered by DeepSeek AI.
                    </p>
                    <div className="flex gap-4 mt-8 flex-wrap justify-center">
                      {["Redes Sociais", "Registros Públicos", "Análise de Risco", "Pegada Digital"].map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full text-xs bg-secondary/50 text-muted-foreground border border-border/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <Card className="border-border/50 bg-card/50 backdrop-blur">
                    <CardContent className="p-8">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                          <div className="h-16 w-16 rounded-full border-2 border-emerald-500/20 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                          </div>
                          <div className="absolute inset-0 h-16 w-16 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" style={{ animationDuration: "2s" }} />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-foreground">Coletando Inteligência...</p>
                          <p className="text-sm text-muted-foreground mt-1">Analisando fontes abertas para "{name}"</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {report && (
                  <Card className="border-border/50 bg-card/50 backdrop-blur">
                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-foreground/80">Relatório Gerado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={copyReport} className="h-8 text-xs hover:bg-secondary">
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={downloadReport} className="h-8 text-xs hover:bg-secondary">
                          <Download className="h-3.5 w-3.5 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[calc(100vh-16rem)]">
                      <div ref={reportRef} className="p-6 prose prose-invert max-w-none">
                        {renderMarkdown(report)}
                      </div>
                    </ScrollArea>
                  </Card>
                )}
              </>
            )}

            {/* USERNAME TAB CONTENT */}
            {activeTab === "username" && (
              <>
                {!usernameResults && !isSearchingUsername && (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                      <UserSearch className="h-10 w-10 text-emerald-500/50" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground/80 mb-2">Blackbird Username Scanner</h2>
                    <p className="text-muted-foreground max-w-md">
                      Busque um username em múltiplas plataformas simultaneamente. Powered by WhatsMyName database.
                    </p>
                    <div className="flex gap-4 mt-8 flex-wrap justify-center">
                      {["GitHub", "Reddit", "GitLab", "Chess.com", "Dev.to", "Keybase", "npm", "+mais"].map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full text-xs bg-secondary/50 text-muted-foreground border border-border/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {isSearchingUsername && usernameProgress && (
                  <Card className="border-border/50 bg-card/50 backdrop-blur">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                          <span className="font-medium text-foreground">Scanning @{username}...</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {usernameProgress.checked}/{usernameProgress.total}
                        </span>
                      </div>
                      <Progress
                        value={(usernameProgress.checked / usernameProgress.total) * 100}
                        className="h-2 mb-6"
                      />

                      {/* Live results */}
                      <div className="space-y-1.5 max-h-96 overflow-y-auto">
                        {usernameProgress.results
                          .filter(r => r.status === "found")
                          .map((result, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 animate-in fade-in slide-in-from-left-2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span className="font-medium text-sm text-foreground">{result.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getCategoryColor(result.category)}`}>
                                {result.category}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {usernameResults && !isSearchingUsername && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="border-emerald-500/20 bg-emerald-500/5">
                        <CardContent className="p-4 text-center">
                          <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-emerald-400">{foundResults.length}</div>
                          <div className="text-xs text-muted-foreground">Encontrados</div>
                        </CardContent>
                      </Card>
                      <Card className="border-border/50 bg-card/50">
                        <CardContent className="p-4 text-center">
                          <XCircle className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                          <div className="text-2xl font-bold text-foreground/60">{notFoundResults.length}</div>
                          <div className="text-xs text-muted-foreground">Não encontrados</div>
                        </CardContent>
                      </Card>
                      <Card className="border-border/50 bg-card/50">
                        <CardContent className="p-4 text-center">
                          <AlertCircle className="h-6 w-6 text-amber-400 mx-auto mb-1" />
                          <div className="text-2xl font-bold text-amber-400">{errorResults.length}</div>
                          <div className="text-xs text-muted-foreground">Erros</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Results */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur">
                      <div className="flex items-center justify-between p-4 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium text-foreground/80">
                            Resultados para @{username}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={exportUsernameResults} className="h-8 text-xs hover:bg-secondary">
                          <Download className="h-3.5 w-3.5 mr-1" /> Exportar
                        </Button>
                      </div>

                      <ScrollArea className="h-[calc(100vh-22rem)]">
                        <div className="p-4 space-y-2">
                          {/* Found section */}
                          {foundResults.length > 0 && (
                            <div className="space-y-1.5">
                              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Perfis Encontrados ({foundResults.length})
                              </h3>
                              {foundResults.map((result, i) => (
                                <a
                                  key={i}
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors group"
                                >
                                  <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <div>
                                      <span className="font-medium text-sm text-foreground">{result.name}</span>
                                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${getCategoryColor(result.category)}`}>
                                        {result.category}
                                      </span>
                                    </div>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Not found section */}
                          {notFoundResults.length > 0 && (
                            <div className="mt-4 space-y-1.5">
                              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <XCircle className="h-3.5 w-3.5" />
                                Não Encontrados ({notFoundResults.length})
                              </h3>
                              {notFoundResults.map((result, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/30"
                                >
                                  <XCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                  <span className="text-sm text-muted-foreground">{result.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getCategoryColor(result.category)}`}>
                                    {result.category}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Osint;
