quick start

```sh
npm install
npm run dev
```

then open http://localhost:5173. thats it.

`npm run build` just checks the js files btw. `dist/` is already the deployable site, no compile step or anything. you can serve it with anything static.

how it works rn

- landing is a webgl water thing. move your mouse / touch and it ripples. theres a pause button if its too much. also respects reduced-motion alr
- explore page is a leaflet map with filters + search + clickable markers
- analyze does building condensate + rainfall math and shows assumptions
- community is just a form + report list
- dashboard is source breakdown + daily vs event totals + priority sites

connecting backend

go to footer -> API settings. put ur backend url in (default is http://localhost:3000) then hit Test & connect.

couple things abt this:

- run frontend on port 5173 locally or cors will complain. backend already allows that one
- if u host the frontend somewhere, u need https backend + add ur frontend origin to the backend cors list. otherwise nah it wont work
- live requests do NOT silently fall back to demo data. if backend fails youll see an error. thats on purpose
- saved backend url is just localStorage. no creds stored anywhere

notes

- map tiles are openstreetmap so u need internet
- fonts are google fonts w system fallback. fine offline just looks slightly different
- leaflet is vendored in dist/assets with license
- water hero image is original, made for this
