import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Group, User, WishlistItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from "recharts";
import { 
  Gift, 
  UserPlus, 
  CheckCircle2, 
  CircleDashed,
  PenBox 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function GroupPage() {
  const { user } = useAuth();
  const { groupId } = useParams();
  const [newUsername, setNewUsername] = useState("");

  const { data: group } = useQuery<Group>({ 
    queryKey: [`/api/groups/${groupId}`] 
  });

  const { data: members = [] } = useQuery<User[]>({ 
    queryKey: [`/api/groups/${groupId}/members`] 
  });

  const { data: allWishlistItems = [] } = useQuery<WishlistItem[]>({ 
    queryKey: [`/api/groups/${groupId}/wishlist/all`] 
  });

  const addMemberMutation = useMutation({
    mutationFn: async (username: string) => {
      await apiRequest("POST", `/api/groups/${groupId}/members`, { username });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
      setNewUsername("");
    }
  });

  const pieData = [
    { name: 'Available', value: allWishlistItems.filter(item => item.status === 'available').length },
    { name: 'Gotten', value: allWishlistItems.filter(item => item.status === 'gotten').length }
  ];

  const COLORS = ['#16a34a', '#dc2626'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{group?.name}</h1>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Group Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => addMemberMutation.mutate(newUsername)}
                  disabled={addMemberMutation.isPending}
                >
                  Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Members & Wishlists</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member) => (
                    <Link 
                      key={member.id} 
                      href={`/groups/${groupId}/wishlist/${member.id}`}
                    >
                      <div className="flex items-center justify-between p-3 hover:bg-accent rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Gift className="h-5 w-5" />
                          <span className="font-medium">
                            {member.username}'s Wishlist
                            {member.id === user?.id && " (You)"}
                          </span>
                        </div>
                        <PenBox className="h-4 w-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gift Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CircleDashed className="h-4 w-4 text-green-600" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-red-600" />
                  <span>Gotten</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}