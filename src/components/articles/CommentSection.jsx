import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Reply, User as UserIcon } from "lucide-react";

export default function CommentSection({ articleId, article, user }) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', articleId],
    queryFn: () => base44.entities.Comment.filter({ article_id: articleId }, "-created_date"),
    initialData: [],
  });

  const postCommentMutation = useMutation({
    mutationFn: async ({ content, parent_comment_id }) => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        throw new Error("Not authenticated");
      }
      const isAuthorReply = user?.email === article.created_by;
      
      // Create the comment
      const newCommentData = await base44.entities.Comment.create({
        article_id: articleId,
        content,
        parent_comment_id,
        author_name: user.display_name || user.full_name,
        is_author_reply: isAuthorReply,
      });

      // Try to update comment count, but don't fail if it doesn't work
      try {
        await base44.entities.Article.update(articleId, {
          comments_count: (article.comments_count || 0) + 1
        });
      } catch (error) {
        console.log("Could not update comment count (permission denied)");
      }

      return newCommentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      setNewComment("");
      setReplyText("");
      setReplyTo(null);
    },
    onError: (error) => {
      console.error("Error posting comment:", error);
      if (error.message !== "Not authenticated") {
        alert("Failed to post comment. Please try again.");
      }
    },
  });

  const handlePostComment = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }
    if (!newComment.trim()) return;
    postCommentMutation.mutate({ content: newComment, parent_comment_id: null });
  };

  const handlePostReply = (parentId) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }
    if (!replyText.trim()) return;
    postCommentMutation.mutate({ content: replyText, parent_comment_id: parentId });
  };

  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => comments.filter(c => c.parent_comment_id === commentId);

  return (
    <div className="border-t border-[var(--border)] pt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6" />
        Comments ({comments.length})
      </h2>

      {/* Post Comment */}
      {user ? (
        <div className="mb-8">
          <Textarea
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-3 min-h-24"
          />
          <Button
            onClick={handlePostComment}
            disabled={!newComment.trim() || postCommentMutation.isPending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {postCommentMutation.isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-[var(--border)]">
          <h3 className="font-semibold mb-2">Join the conversation</h3>
          <p className="text-[var(--muted-foreground)] mb-4">
            Sign in to share your thoughts and engage with other readers
          </p>
          <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}>
            Sign In to Comment
          </Button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {topLevelComments.map((comment) => {
          const replies = getReplies(comment.id);
          return (
            <div key={comment.id} className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)]">
              {/* Comment Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-semibold">
                  {comment.author_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{comment.author_name}</span>
                    {comment.is_author_reply && (
                      <span className="px-2 py-0.5 bg-[var(--accent)] text-white text-xs rounded-full">
                        Author
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {format(new Date(comment.created_date), "MMM d, yyyy 'at' HH:mm")}
                  </span>
                </div>
              </div>

              {/* Comment Content */}
              <p className="text-[var(--foreground)] mb-3 whitespace-pre-wrap">{comment.content}</p>

              {/* Comment Actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!user) {
                    base44.auth.redirectToLogin(window.location.pathname + window.location.search);
                    return;
                  }
                  setReplyTo(replyTo === comment.id ? null : comment.id);
                }}
                className="gap-1"
              >
                <Reply className="w-3 h-3" />
                Reply
              </Button>

              {/* Reply Form */}
              {replyTo === comment.id && user && (
                <div className="mt-3 pl-12">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="mb-2 min-h-20"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePostReply(comment.id)}
                      disabled={!replyText.trim() || postCommentMutation.isPending}
                    >
                      {postCommentMutation.isPending ? "Posting..." : "Post Reply"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {replies.length > 0 && (
                <div className="mt-4 pl-12 space-y-4 border-l-2 border-[var(--border)]">
                  {replies.map((reply) => (
                    <div key={reply.id} className="pl-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm font-semibold">
                          {reply.author_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{reply.author_name}</span>
                            {reply.is_author_reply && (
                              <span className="px-1.5 py-0.5 bg-[var(--accent)] text-white text-xs rounded-full">
                                Author
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {format(new Date(reply.created_date), "MMM d, yyyy 'at' HH:mm")}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {comments.length === 0 && !isLoading && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            No comments yet. {user ? "Be the first to share your thoughts!" : "Sign in to be the first to comment!"}
          </div>
        )}
      </div>
    </div>
  );
}