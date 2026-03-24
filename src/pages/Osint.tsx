import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { generateChatResponse, ChatMessage } from "@/services/openai";
import { prepareOsintMessages } from "@/services/osintContext";
import { Search, Shield, Download, Copy, ArrowLeft, Loader2, User, Globe, Briefcase, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const Osint = () => {
  const [name, setName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<{ name: string; timestamp: string }[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
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
      const response = await generateChatResponse(messages, apiKey);
      setReport(response);
      setSearchHistory(prev => [
        { name: name.trim(), timestamp: new Date().toLocaleString() },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error("OSINT search error:", error);
    } finally {
      setIsLoading(false);
    }
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

  // Simple markdown renderer
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
            {/* Search Form */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <form onSubmit={handleSearch} className="space-y-3">
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

            {/* Quick Stats */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos Ativos</h3>
                <div className="space-y-2">
                  {[
                    { icon: Globe, label: "Digital Footprint", color: "text-blue-400" },
                    { icon: Briefcase, label: "Professional Intel", color: "text-purple-400" },
                    { icon: Search, label: "Public Records", color: "text-amber-400" },
                    { icon: AlertTriangle, label: "Risk Assessment", color: "text-red-400" },
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
                        onClick={() => setName(item.name)}
                        className="w-full text-left p-2 rounded-md hover:bg-secondary/50 transition-colors"
                      >
                        <div className="text-sm font-medium text-foreground/80">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.timestamp}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!report && !isLoading && (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Shield className="h-10 w-10 text-emerald-500/50" />
                </div>
                <h2 className="text-2xl font-bold text-foreground/80 mb-2">OSINT Intelligence Platform</h2>
                <p className="text-muted-foreground max-w-md">
                  Insira um nome no painel lateral para iniciar uma investigação de inteligência de código aberto powered by DeepSeek AI.
                </p>
                <div className="flex gap-4 mt-8">
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
                    <div className="w-64 space-y-2 mt-4">
                      {["Scanning digital footprint...", "Checking public records...", "Analyzing risk profile..."].map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse" style={{ animationDelay: `${i * 0.5}s` }}>
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {step}
                        </div>
                      ))}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Osint;
