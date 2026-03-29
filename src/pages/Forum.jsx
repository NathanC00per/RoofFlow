import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BellOff, Bell, MessageSquare, Pin, Plus, Send, ChevronDown, ChevronUp, Megaphone } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { createNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "announcements", label: "Announcements" },
  { value: "jobs", label: "Jobs" },
  { value: "safety", label: "Safety" },
  { value: "social", label: "Social" },
];

const CATEGORY_COLORS = {
  general: "bg-secondary text-secondary-foreground",
  announcements: "bg-yellow-100 text-yellow-800",
  jobs: "bg-blue-100 text-blue-800",
  safety: "bg-red-100 text-red-800",
  social: "bg-green-100 text-green-800",
};

function ReplyForm({ postId, currentUser, onDone }) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: () => base44.entities.ForumPost.create({
      content,
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email,
      parent_id: postId,
    }),
    onSuccess: async (reply) => {
      queryClient.invalidateQueries({ queryKey: ["forum"] });
      setContent("");
      onDone?.();
      // Notify all users who engaged with this thread (simplified: notify admins/all)
      const users = await base44.entities.User.list();
      const post = (await base44.entities.ForumPost.filter({ id: postId }))[0];
      const muteList = post?.muted_by || [];
      for (const u of users) {
        if (u.email !== currentUser.email && !muteList.includes(u.email)) {
          createNotification({
            user_email: u.email,
            type: "forum_reply",
            title: "New reply in forum thread",
            message: `${currentUser.full_name || currentUser.email}: ${content.slice(0, 80)}`,
            link: `/forum`,
            related_id: postId,
          }).catch(() => {});
        }
      }
    },
  });

  return (
    <div className="flex gap-2 mt-3">
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write a reply..."
        className="min-h-[60px] text-sm"
      />
      <Button size="sm" className="self-end" disabled={!content.trim()} onClick={() => replyMutation.mutate()}>
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ThreadCard({ post, replies, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const queryClient = useQueryClient();

  const isMuted = (post.muted_by || []).includes(currentUser?.email);

  const toggleMuteMutation = useMutation({
    mutationFn: async () => {
      const current = post.muted_by || [];
      const updated = isMuted
        ? current.filter(e => e !== currentUser.email)
        : [...current, currentUser.email];
      return base44.entities.ForumPost.update(post.id, { muted_by: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum"] });
      toast.success(isMuted ? "Notifications unmuted" : "Notifications muted for this thread");
    },
  });

  const pinMutation = useMutation({
    mutationFn: () => base44.entities.ForumPost.update(post.id, { is_pinned: !post.is_pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum"] }),
  });

  return (
    <Card className={cn("transition-all", post.is_pinned && "border-primary/40 bg-primary/5")}>
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
            {(post.author_name || "?")[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {post.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
              <h3 className="font-semibold text-sm">{post.title || post.content.slice(0, 60)}</h3>
              <Badge className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[post.category] || CATEGORY_COLORS.general)}>
                {post.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {post.author_name} · {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" title={isMuted ? "Unmute" : "Mute thread"}
              onClick={() => toggleMuteMutation.mutate()}>
              {isMuted ? <BellOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Bell className="w-3.5 h-3.5" />}
            </Button>
            {currentUser?.role === "admin" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" title={post.is_pinned ? "Unpin" : "Pin"}
                onClick={() => pinMutation.mutate()}>
                <Pin className={cn("w-3.5 h-3.5", post.is_pinned && "text-primary")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-4">
        <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>

        {/* Replies toggle */}
        {replies.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-primary mt-3 hover:underline"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {expanded && (
          <div className="mt-3 pl-4 border-l-2 border-border space-y-3">
            {replies.map(r => (
              <div key={r.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {(r.author_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium">{r.author_name} <span className="text-muted-foreground font-normal">· {formatDistanceToNow(new Date(r.created_date), { addSuffix: true })}</span></p>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply button */}
        <div className="mt-3">
          {showReply ? (
            <ReplyForm postId={post.id} currentUser={currentUser} onDone={() => { setShowReply(false); setExpanded(true); }} />
          ) : (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 -ml-2" onClick={() => setShowReply(true)}>
              <MessageSquare className="w-3.5 h-3.5" /> Reply
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Forum() {
  const [currentUser, setCurrentUser] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "general" });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allPosts = [] } = useQuery({
    queryKey: ["forum"],
    queryFn: () => base44.entities.ForumPost.list("-created_date", 200),
    refetchInterval: 30000,
  });

  const topLevelPosts = allPosts
    .filter(p => !p.parent_id)
    .filter(p => categoryFilter === "all" || p.category === categoryFilter)
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const replies = allPosts.filter(p => !!p.parent_id);

  const createPostMutation = useMutation({
    mutationFn: () => base44.entities.ForumPost.create({
      ...newPost,
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email,
      muted_by: [],
    }),
    onSuccess: async (post) => {
      queryClient.invalidateQueries({ queryKey: ["forum"] });
      setShowNewPost(false);
      setNewPost({ title: "", content: "", category: "general" });
      toast.success("Post created!");
      // Notify all other users
      const users = await base44.entities.User.list();
      for (const u of users) {
        if (u.email !== currentUser.email) {
          createNotification({
            user_email: u.email,
            type: "forum_post",
            title: `New forum post: ${newPost.title || newPost.content.slice(0, 40)}`,
            message: `${currentUser.full_name || currentUser.email} posted in ${newPost.category}`,
            link: `/forum`,
            related_id: post.id,
          }).catch(() => {});
        }
      }
    },
  });

  return (
    <div>
      <PageHeader title="Company Forum" subtitle="Stay connected with your team">
        <Button onClick={() => setShowNewPost(!showNewPost)} className="gap-2">
          <Plus className="w-4 h-4" /> New Post
        </Button>
      </PageHeader>

      {/* New Post Form */}
      {showNewPost && (
        <Card className="mb-6">
          <CardContent className="pt-5 space-y-3">
            <Input
              placeholder="Post title (optional)"
              value={newPost.title}
              onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
            />
            <Textarea
              placeholder="What's on your mind?"
              value={newPost.content}
              onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between gap-3">
              <Select value={newPost.category} onValueChange={v => setNewPost(p => ({ ...p, category: v }))}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.value !== "all").map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewPost(false)}>Cancel</Button>
                <Button disabled={!newPost.content.trim()} onClick={() => createPostMutation.mutate()}>
                  <Megaphone className="w-4 h-4 mr-2" /> Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              categoryFilter === c.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {topLevelPosts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No posts yet. Start the conversation!</p>
          </div>
        ) : (
          topLevelPosts.map(post => (
            <ThreadCard
              key={post.id}
              post={post}
              replies={replies.filter(r => r.parent_id === post.id)}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}