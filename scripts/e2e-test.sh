#!/bin/bash
# End-to-end business logic test for Study Sir
BASE=http://localhost:3000/api
J() { python3 -c "import json,sys; d=json.load(sys.stdin); $1"; }

echo "=== 1. Get users ==="
USERS=$(curl -s $BASE/users)
AHMED=$(echo "$USERS" | J "print([u['id'] for u in d['users'] if u['name']=='Ahmed Raza'][0])")
NOMAN=$(echo "$USERS" | J "print([u['id'] for u in d['users'] if u['name']=='Noman Ali'][0])")
echo "ahmed=$AHMED noman=$NOMAN"

echo "=== 2. Ahmed posts a tuition (fee 30-70 ONLINE -> cost 5+5=10) ==="
POST=$(curl -s -c /tmp/ahmed.jar -X POST $BASE/session -H 'Content-Type: application/json' -d "{\"userId\":\"$AHMED\"}" > /dev/null; curl -s -b /tmp/ahmed.jar -X POST $BASE/tuition -H 'Content-Type: application/json' -d '{"title":"Test Math Tuition E2E","description":"Testing","mode":"ONLINE","feeMin":30,"feeMax":70,"subjects":"Math"}')
POSTID=$(echo "$POST" | J "print(d['tuition']['id'])")
COST=$(echo "$POST" | J "print(d['tuition']['coinCost'])")
echo "post=$POSTID coinCost=$COST (expect 10)"

echo "=== 3. Noman (50 coins) contacts post ==="
curl -s -c /tmp/noman.jar -X POST $BASE/session -H 'Content-Type: application/json' -d "{\"userId\":\"$NOMAN}\"}" > /dev/null 2>&1
curl -s -c /tmp/noman.jar -X POST $BASE/session -H 'Content-Type: application/json' -d "{\"userId\":\"$NOMAN\"}" > /dev/null
CONN=$(curl -s -b /tmp/noman.jar -X POST $BASE/connections -H 'Content-Type: application/json' -d "{\"tuitionPostId\":\"$POSTID\"}")
CONID=$(echo "$CONN" | J "print(d['connection']['id'])")
NOMAN_COINS=$(curl -s -b /tmp/noman.jar $BASE/wallet | J "print(d['coins'])")
echo "conn=$CONID noman coins after spend (expect 40): $NOMAN_COINS"

echo "=== 4. Noman sends first message (teacher msg does NOT start chat) ==="
curl -s -b /tmp/noman.jar -X POST $BASE/connections/$CONID/messages -H 'Content-Type: application/json' -d '{"content":"Hello Ahmed, I can help!"}' | J "print('msg:', d['message']['content'][:30])"
STATUS=$(curl -s -b /tmp/noman.jar $BASE/connections/$CONID | J "print(d['connection']['status'], bool(d['connection']['chatStartedAt']))")
echo "status+chatStarted (expect PENDING False): $STATUS"

echo "=== 5. Ahmed REJECTS before replying -> refund expected ==="
RES=$(curl -s -b /tmp/ahmed.jar -X POST $BASE/connections/$CONID/decide -H 'Content-Type: application/json' -d '{"action":"REJECT"}')
echo "$RES" | J "print('refunded:', d['refunded'], 'status:', d['connection']['status'])"
NOMAN_COINS=$(curl -s -b /tmp/noman.jar $BASE/wallet | J "print(d['coins'])")
echo "noman coins after refund (expect 50): $NOMAN_COINS"

echo "=== 6. Ahmed rejects AGAIN -> should 409 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/ahmed.jar -X POST $BASE/connections/$CONID/decide -H 'Content-Type: application/json' -d '{"action":"REJECT"}')
echo "second reject http code (expect 409): $CODE"

echo "=== 7. New flow: Noman contacts again, Ahmed REPLIES (chat starts), then reject -> NO refund ==="
CONN2=$(curl -s -b /tmp/noman.jar -X POST $BASE/connections -H 'Content-Type: application/json' -d "{\"tuitionPostId\":\"$POSTID\"}")
CONID2=$(echo "$CONN2" | J "print(d['connection']['id'])")
curl -s -b /tmp/noman.jar -X POST $BASE/connections/$CONID2/messages -H 'Content-Type: application/json' -d '{"content":"Hi again"}' > /dev/null
curl -s -b /tmp/ahmed.jar -X POST $BASE/connections/$CONID2/messages -H 'Content-Type: application/json' -d '{"content":"Sure, tell me more"}' > /dev/null
RES2=$(curl -s -b /tmp/ahmed.jar -X POST $BASE/connections/$CONID2/decide -H 'Content-Type: application/json' -d '{"action":"REJECT"}')
echo "$RES2" | J "print('refunded (expect False):', d['refunded'], 'status:', d['connection']['status'])"
NOMAN_COINS=$(curl -s -b /tmp/noman.jar $BASE/wallet | J "print(d['coins'])")
echo "noman coins (expect 40, no refund): $NOMAN_COINS"

echo "=== 8. Message after decision -> 423 locked ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/noman.jar -X POST $BASE/connections/$CONID2/messages -H 'Content-Type: application/json' -d '{"content":"hello?"}')
echo "locked chat http code (expect 423): $CODE"

echo "=== 9. HIRE flow: Noman contacts, Ahmed hires -> tuition HIRED + bonus ==="
CONN3=$(curl -s -b /tmp/noman.jar -X POST $BASE/connections -H 'Content-Type: application/json' -d "{\"tuitionPostId\":\"$POSTID\"}")
CONID3=$(echo "$CONN3" | J "print(d['connection']['id'])")
RES3=$(curl -s -b /tmp/ahmed.jar -X POST $BASE/connections/$CONID3/decide -H 'Content-Type: application/json' -d '{"action":"HIRE"}')
echo "$RES3" | J "print('status (expect HIRED):', d['connection']['status'])"
NOMAN_COINS=$(curl -s -b /tmp/noman.jar $BASE/wallet | J "print(d['coins'])")
echo "noman coins (expect 40 + hire bonus 5 = 45): $NOMAN_COINS"
POSTSTATUS=$(curl -s $BASE/tuition/$POSTID | J "print(d['tuition']['status'])")
echo "tuition status (expect HIRED): $POSTSTATUS"

echo "=== 10. Expired refunds (stale Adani connection 11 days old) ==="
curl -s -X POST $BASE/cron/process-refunds | J "print('processed:', d['processed'])"

echo "=== 11. Notifications for Ahmed ==="
curl -s -b /tmp/ahmed.jar $BASE/notifications | J "print('unread:', d['unread'], 'count:', len(d['notifications']))"

echo "=== 12. Like toggle ==="
LK=$(curl -s -b /tmp/noman.jar -X POST $BASE/likes -H 'Content-Type: application/json' -d "{\"targetType\":\"TUITION\",\"targetId\":\"$POSTID\"}")
echo "$LK" | J "print('liked:', d['liked'], 'count:', d['likeCount'])"

echo "=== DONE ==="
