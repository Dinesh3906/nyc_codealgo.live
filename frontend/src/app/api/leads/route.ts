import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, org } = body;
    if (typeof name !== 'string' || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid lead data' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Waitlist updated' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid lead data' }, { status: 400 });
  }
}
