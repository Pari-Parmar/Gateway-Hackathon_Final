@echo off
echo ========================================================
echo Pushing FRONTLINE AI Vercel fixes to GitHub...
echo ========================================================
git add .
git commit -m "Fix Vercel 404 deployment configuration and routing"
git push origin main
echo ========================================================
echo DONE! Vercel is now rebuilding automatically!
echo Check your Vercel dashboard in 30 seconds!
echo ========================================================
pause
