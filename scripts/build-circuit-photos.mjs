/* Metadata only: no photo binaries are downloaded. Review candidates before publication. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('.vercel',{recursive:true});
const stories=JSON.parse(await readFile('data/circuit-stories.json','utf8'));
let photos={};try{photos=JSON.parse(await readFile('.vercel/circuit-photo-candidates.json','utf8'));}catch{}
const queue=Object.entries(stories).filter(([id])=>!photos[id]);
const plain=value=>(value??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
async function api(domain,params){const r=await fetch(`https://${domain}/w/api.php?${new URLSearchParams({format:'json',...params})}`,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'TelemetryOneHistory/1.0 (https://telemetry-1.vercel.app/historia)'}});if(!r.ok)throw Error(r.status);return r.json();}
await Promise.all(Array.from({length:2},async()=>{while(queue.length){const [id,story]=queue.shift();try{
 const title=decodeURIComponent(story.source.split('/wiki/')[1]);
 const data=await api('en.wikipedia.org',{action:'query',titles:title,prop:'images',imlimit:'100',redirects:'1'});
 const page=Object.values(data.query?.pages??{})[0];
 const files=(page?.images??[]).map(i=>i.title).filter(title=>/\.(jpe?g|webp)$/i.test(title)&&!/logo|flag|map|layout|diagram|portrait|signature|coat of|accident|crash|senna|schumacher|hamilton|verstappen|button|clark/i.test(title));
 const result=files.length?await api('commons.wikimedia.org',{action:'query',titles:files.slice(0,40).join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1200'}):{};
 photos[id]=Object.values(result.query?.pages??{}).flatMap(p=>{const info=p.imageinfo?.[0];const m=info?.extmetadata??{};const license=plain(m.LicenseShortName?.value);if(!/^(CC BY|CC0|Public domain)/i.test(license)||!info?.thumburl||!info?.descriptionurl)return[];return[{title:p.title,url:info.thumburl,page:info.descriptionurl,author:plain(m.Artist?.value).slice(0,350),license,licenseUrl:m.LicenseUrl?.value,description:plain(m.ImageDescription?.value).slice(0,1000)}];});
 await writeFile('.vercel/circuit-photo-candidates.json',JSON.stringify(photos,null,2));console.log(id,photos[id].length);
 }catch(e){console.log(id,String(e));}}}));
