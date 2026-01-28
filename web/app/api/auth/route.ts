import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, email, password, username } = body;
  
  const supabase = await createClient();

  if (action === "register") {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name: username,
          },
        },
      });

      if (error) throw error;

      // Try to create profile if it doesn't exist (assuming public.profiles table)
      if (data.user) {
        // We ignore error here in case a trigger already created it
        await supabase.from('profiles').upsert({
           id: data.user.id,
           username,
           name: username,
        }).select();
      }

      return NextResponse.json({ 
        success: true, 
        user: { 
          id: data.user?.id,
          email: data.user?.email,
          username: data.user?.user_metadata?.username 
        } 
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Failed to register" }, 
        { status: 400 }
      );
    }
  }

  if (action === "login") {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      return NextResponse.json({ 
        success: true, 
        user: { 
          id: data.user.id, 
          email: data.user.email, 
          username: data.user.user_metadata.username 
        } 
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: "Invalid credentials" }, 
        { status: 401 }
      );
    }
  }

  if (action === "logout") {
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    return NextResponse.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.user_metadata?.username 
        } 
    });
  }

  return NextResponse.json({ user: null });
}
