/** Lucide icon outlines embedded as SVG; no external network dependency. */
const paths = {
  "layout-dashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>",
  "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>",
  "swords": "<polyline points=\"14.5 17.5 3 6 3 3 6 3 17.5 14.5\"/><line x1=\"13\" x2=\"19\" y1=\"19\" y2=\"13\"/><line x1=\"16\" x2=\"20\" y1=\"16\" y2=\"20\"/><line x1=\"19\" x2=\"21\" y1=\"21\" y2=\"19\"/><polyline points=\"14.5 6.5 18 3 21 3 21 6 17.5 9.5\"/><line x1=\"5\" x2=\"9\" y1=\"14\" y2=\"18\"/><line x1=\"7\" x2=\"4\" y1=\"17\" y2=\"20\"/><line x1=\"3\" x2=\"5\" y1=\"19\" y2=\"21\"/>",
  "flag": "<path d=\"M4 22V4\"/><path d=\"M4 4c4-3 8 3 12 0v12c-4 3-8-3-12 0\"/>",
  "shield-ban": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"m9.2 9.2 5.6 5.6\"/>",
  "messages-square": "<path d=\"M14 9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4 3v-4\"/><path d=\"M14 14H6l-4 3V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2\"/>",
  "skull": "<path d=\"M12 2a8 8 0 0 0-8 8 8 8 0 0 0 3 6.25V21h10v-4.75A8 8 0 0 0 12 2Z\"/><circle cx=\"9\" cy=\"11\" r=\"1\"/><circle cx=\"15\" cy=\"11\" r=\"1\"/><path d=\"m10 16 2-2 2 2\"/><path d=\"M10 21v-2\"/><path d=\"M14 21v-2\"/>",
  "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><polyline points=\"16 17 21 12 16 7\"/><line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.35-4.35\"/>",
  "database": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5v14a9 3 0 0 0 18 0V5\"/><path d=\"M3 12a9 3 0 0 0 18 0\"/>",
  "arrow-up-right": "<path d=\"M7 17 17 7\"/><path d=\"M7 7h10v10\"/>"
};
export function icon(name) {
 const path=paths[name]; if(!path)return '';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-'+name+'" aria-hidden="true">'+path+'</svg>';
}
