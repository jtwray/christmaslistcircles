import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { WishlistItem, insertWishlistItemSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Gift, Package, Upload, ExternalLink, CheckCircle2 } from "lucide-react";
import { scrapeUrl } from "@/lib/scraper";
import { useState } from "react";

export default function WishlistPage() {
  const { user } = useAuth();
  const { groupId, userId } = useParams();
  const [scraping, setScraping] = useState(false);

  const { data: items = [] } = useQuery<WishlistItem[]>({ 
    queryKey: [`/api/groups/${groupId}/wishlist/${userId}`],
    enabled: !!groupId && !!userId // Only fetch when IDs are available
  });

  const form = useForm({
    resolver: zodResolver(insertWishlistItemSchema),
    defaultValues: {
      name: "",
      url: "",
      price: "",
      description: "",
      imageUrl: "",
      isSurprise: false,
      groupId: parseInt(groupId || "0"),
      userId: parseInt(userId || "0")
    }
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!groupId) throw new Error("Group ID is required");
      await apiRequest("POST", `/api/groups/${groupId}/wishlist`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/wishlist/${userId}`] });
      form.reset();
    }
  });

  const markAsGottenMutation = useMutation({
    mutationFn: async ({ itemId, receipt }: { itemId: number; receipt: string }) => {
      await apiRequest("PATCH", `/api/wishlist/${itemId}`, {
        status: "gotten",
        receipt
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/wishlist/${userId}`] });
    }
  });

  async function onScrapeUrl(url: string) {
    setScraping(true);
    try {
      const data = await scrapeUrl(url);
      form.setValue("name", data.name);
      form.setValue("price", data.price);
      form.setValue("description", data.description);
      form.setValue("imageUrl", data.imageUrl);
    } catch (error) {
      console.error("Failed to scrape URL:", error);
    }
    setScraping(false);
  }

  const isOwnWishlist = user?.id === parseInt(userId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {isOwnWishlist ? "Your Wishlist" : "Their Wishlist"}
          </h1>

          {isOwnWishlist && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Gift className="mr-2 h-4 w-4" />
                  Add Gift
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Gift to Wishlist</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createItemMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product URL</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <Button 
                              type="button"
                              variant="outline"
                              onClick={() => onScrapeUrl(field.value)}
                              disabled={scraping}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={createItemMutation.isPending}>
                      Add to Wishlist
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.isSurprise && !isOwnWishlist ? (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              ) : (
                item.imageUrl && (
                  <div className="aspect-video relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )
              )}
              
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold">
                  {item.isSurprise && !isOwnWishlist ? "Surprise Gift" : item.name}
                </h3>
                
                {(!item.isSurprise || isOwnWishlist) && (
                  <>
                    {item.price && <p className="text-sm">Price: {item.price}</p>}
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.url && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Product
                      </a>
                    )}
                  </>
                )}

                {!isOwnWishlist && item.status === 'available' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Mark as Gotten
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Receipt</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                markAsGottenMutation.mutate({
                                  itemId: item.id,
                                  receipt: reader.result as string
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {!isOwnWishlist && item.status === 'gotten' && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Purchased</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}