#!/usr/bin/env bash
# Interactive first-time setup for the production database (no demo data):
# platform admin, one business + first location with opening hours, the owner
# login, and any number of staff logins. Passwords are typed hidden, never
# printed, and never passed on a command line.
# Usage on the VPS: bash /opt/queueflow/scripts/setup-production.sh
set -euo pipefail
cd "$(dirname "$0")/../backend"

DATA=""
add() { DATA+="$(python3 -c 'import json,os,sys; print(json.dumps({k: os.environ.get("F_"+k, "") for k in sys.argv[1:]} | {"type": os.environ["F_type"]}))' "$@")"$'\n'; }

ask() { # ask VAR "Question" [default]
  local def="${3:-}" ans
  if [ -n "$def" ]; then read -rp "$2 [$def]: " ans; ans="${ans:-$def}"; else
    while :; do read -rp "$2: " ans; [ -n "$ans" ] && break; done; fi
  printf -v "$1" '%s' "$ans"
}
ask_pw() { # ask_pw VAR "Who"
  local a b
  while :; do
    read -rsp "  Password for $2 (min 12 chars, hidden): " a; echo
    read -rsp "  Repeat password: " b; echo
    if [ "$a" != "$b" ]; then echo "  Passwords do not match, try again."; continue; fi
    if [ ${#a} -lt 12 ]; then echo "  Too short, at least 12 characters."; continue; fi
    break
  done
  printf -v "$1" '%s' "$a"
}

echo "== 1/4 Platform admin (admin.quyk.io) — leave email empty to skip if you already have one"
read -rp "Admin email: " F_email
if [ -n "$F_email" ]; then
  ask_pw F_password "admin"; F_type=admin; export F_type F_email F_password; add email password
fi

echo; echo "== 2/4 Business and first location"
ask F_name "Business name"
def_slug=$(printf '%s' "$F_name" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
ask F_slug "Short name for links (lowercase-dashes)" "$def_slug"
ask F_email "Business contact email"
read -rp "Business phone (optional): " F_phone
ask F_plan "Plan (starter / growth / scale)" "scale"
ask F_timezone "Timezone (Asia/Karachi, Asia/Dubai, Europe/London, America/New_York)" "Asia/Karachi"
ask F_branchName "First location name" "$F_name"
def_code=$(printf '%s' "$F_slug" | tr '[:lower:]' '[:upper:]' | tr -cd 'A-Z0-9' | cut -c1-6); [ ${#def_code} -ge 2 ] || def_code=MAIN
ask F_branchCode "Location code (2-20 of A-Z 0-9)" "$def_code"
read -rp "City (optional): " F_city
read -rp "Country (optional): " F_country
ask F_openTime "Opens at (24h HH:MM, every day)" "09:00"
ask F_closeTime "Closes at (24h HH:MM)" "23:00"
F_type=business
export F_type F_name F_slug F_email F_phone F_plan F_timezone F_branchName F_branchCode F_city F_country F_openTime F_closeTime
add name slug email phone plan timezone branchName branchCode city country openTime closeTime

echo; echo "== 3/4 Owner (business.quyk.io)"
ask F_fullName "Owner full name"
ask F_email "Owner email"
ask_pw F_password "owner"
F_type=owner; export F_type F_fullName F_email F_password; add fullName email password

echo; echo "== 4/4 Staff (staff.quyk.io) — leave email empty when done"
n=0
while :; do
  read -rp "Staff #$((n + 1)) email (empty = done): " F_email
  [ -z "$F_email" ] && break
  ask F_fullName "  Full name"
  ask F_role "  Role (staff / manager)" "staff"
  ask_pw F_password "$F_email"
  F_type=staff; export F_type F_fullName F_email F_password F_role; add fullName email password role
  n=$((n + 1))
done
unset F_password

echo; echo "Creating everything (all-or-nothing)..."
printf '%s' "$DATA" | npx dotenv -c production -- npx ts-node --transpile-only prisma/setup-production.ts
DATA=""
