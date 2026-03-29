import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, org } = body;

    // Simulation: In a real app, save to DB here.
    console.log(`[LEAD CAPTURED] Name: ${name}, Email: ${email}, Org: ${org}`);

    return NextResponse.json({ success: true, message: 'Waitlist updated' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid lead data' }, { status: 400 });
  }
}
