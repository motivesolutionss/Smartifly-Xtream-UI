"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Send, User, Headphones, Paperclip, Loader2, AlertCircle, FileIcon, Copy, Clock, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReplyTicket, useUploadAttachments } from "@/hooks/useTicket";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types";

interface TicketStatusProps {
  ticket: Ticket;
}

export function TicketStatus({ ticket }: TicketStatusProps) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: reply, isPending: isReplying } = useReplyTicket();
  const { mutate: upload, isPending: isUploading } = useUploadAttachments();

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "open" | "in_progress" | "closed" | "success" }> = {
    OPEN: { label: "Open", variant: "open" },
    IN_PROGRESS: { label: "In Progress", variant: "in_progress" },
    RESOLVED: { label: "Resolved", variant: "success" },
    CLOSED: { label: "Closed", variant: "closed" },
  };

  const { label: statusLabel, variant: statusVariant } = statusMap[ticket.status] || { label: ticket.status, variant: "default" };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket.replies, ticket.attachments]);

  const handleReply = () => {
    if (!message.trim()) return;

    reply(
      { ticketNo: ticket.ticketNo, message },
      {
        onSuccess: () => {
          setMessage("");
        },
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      upload({
        ticketNo: ticket.ticketNo,
        files: Array.from(e.target.files)
      });
      // Reset input
      e.target.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  const copyTicketId = () => {
    navigator.clipboard.writeText(ticket.ticketNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] max-w-4xl mx-auto glass-card-strong rounded-2xl overflow-hidden border border-border/50 shadow-2xl relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-20">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight truncate pr-2">{ticket.subject}</h2>
                <Badge variant={statusVariant} className="shrink-0 uppercase tracking-wider text-[10px] px-2 h-5 flex items-center">
                  {statusLabel}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <button
                  onClick={copyTicketId}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <span className="font-mono text-xs text-white/80 group-hover:text-white">#{ticket.ticketNo}</span>
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />}
                </button>

                <div className="flex items-center gap-1.5 text-xs opacity-70">
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block shrink-0 bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-xs text-muted-foreground mb-1">Requester</p>
              <div className="font-medium text-white text-sm">{ticket.name}</div>
              <div className="text-xs text-white/50">{ticket.email}</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-200 leading-relaxed">
              Please <button onClick={copyTicketId} className="font-semibold text-blue-100 hover:text-white hover:underline transition-colors">copy and save this Ticket ID</button>. You will need it to track the status of your request in the future.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-background/30">

        {/* Initial Ticket Message (User) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end gap-3"
        >
          <div className="flex flex-col items-end max-w-[85%]">
            <div className="bg-primary/20 text-foreground p-4 rounded-2xl rounded-tr-sm border border-primary/20 shadow-sm relative group w-full">
              <p className="text-sm whitespace-pre-wrap leading-relaxed break-words break-all">{ticket.message}</p>

              {/* Visual Attachment Display */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary/20 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ticket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${att.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-background/40 hover:bg-background/60 transition-colors border border-primary/10 group/att"
                    >
                      <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground/90">{att.filename}</p>
                        <p className="text-[10px] text-muted-foreground">{(att.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 px-1">
              You • {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
            <User className="w-4 h-4 text-primary" />
          </div>
        </motion.div>

        {/* Separator */}
        {ticket.replies.length > 0 && (
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background-elevated px-2 text-muted-foreground/50">Conversation</span>
            </div>
          </div>
        )}

        {/* Replies */}
        <AnimatePresence initial={false}>
          {ticket.replies.map((reply) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                reply.isAdmin ? "justify-start" : "justify-end"
              )}
            >
              {reply.isAdmin && (
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Headphones className="w-4 h-4 text-accent" />
                </div>
              )}

              <div className={cn(
                "flex flex-col max-w-[85%]",
                reply.isAdmin ? "items-start" : "items-end"
              )}>
                <div className={cn(
                  "p-4 rounded-2xl shadow-sm border relative text-sm whitespace-pre-wrap leading-relaxed break-words break-all",
                  reply.isAdmin
                    ? "bg-background-tertiary border-white/10 text-foreground rounded-tl-sm"
                    : "bg-primary/20 border-primary/20 text-foreground rounded-tr-sm"
                )}>
                  {reply.message}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {reply.isAdmin ? "Support Team" : "You"} • {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                </span>
              </div>

              {!reply.isAdmin && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 backdrop-blur-md border-t border-white/10">
        {ticket.status === 'CLOSED' ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4" />
            This ticket is closed and cannot be replied to.
          </div>
        ) : (
          <div className="relative flex items-end gap-2 p-2 bg-background-elevated rounded-xl border border-white/10 focus-within:border-primary/50 transition-colors">
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx"
            />

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              className="min-h-[50px] max-h-[150px] resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-3 leading-relaxed"
            />

            <div className="flex flex-col gap-2 pb-2 pr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-white hover:bg-white/10"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isReplying}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>

              <Button
                size="icon"
                onClick={handleReply}
                disabled={!message.trim() || isReplying || isUploading}
                className="h-9 w-9 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
