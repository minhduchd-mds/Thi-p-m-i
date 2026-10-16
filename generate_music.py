#!/usr/bin/env python3
"""Create 4 original, locally synthesised instrumental wedding tracks.
Soundfonts: system TimGM6mb.sf2. Final recordings composed/synthesised for Hỷ Studio.
Only stdlib + numpy are needed for PCM rendering; ffmpeg encodes MP3.
"""
import ctypes as C, math, os, random, subprocess, tempfile, wave
import numpy as np

SF = '/usr/share/sounds/sf2/TimGM6mb.sf2'
OUT = os.path.join(os.path.dirname(__file__),'public','assets','music')
os.makedirs(OUT,exist_ok=True)
SAMPLE_RATE=32000
lib=C.CDLL('libfluidsynth.so.3')
# ctypes interfaces
specs=[('new_fluid_settings',[],C.c_void_p),('fluid_settings_setnum',[C.c_void_p,C.c_char_p,C.c_double],C.c_int),('fluid_settings_setint',[C.c_void_p,C.c_char_p,C.c_int],C.c_int),('new_fluid_synth',[C.c_void_p],C.c_void_p),('fluid_synth_sfload',[C.c_void_p,C.c_char_p,C.c_int],C.c_int),('fluid_synth_program_change',[C.c_void_p,C.c_int,C.c_int],C.c_int),('fluid_synth_cc',[C.c_void_p,C.c_int,C.c_int,C.c_int],C.c_int),('fluid_synth_noteon',[C.c_void_p,C.c_int,C.c_int,C.c_int],C.c_int),('fluid_synth_noteoff',[C.c_void_p,C.c_int,C.c_int],C.c_int),('fluid_synth_all_sounds_off',[C.c_void_p,C.c_int],C.c_int),('fluid_synth_write_float',[C.c_void_p,C.c_int,C.c_void_p,C.c_int,C.c_int,C.c_void_p,C.c_int,C.c_int],C.c_int),('delete_fluid_synth',[C.c_void_p],None),('delete_fluid_settings',[C.c_void_p],None)]
for name,args,restype in specs:
 f=getattr(lib,name); f.argtypes=args; f.restype=restype

# Note names in C4=60 convention.
NOTES={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
def N(n):
 if isinstance(n,int):return n
 base=n[:2] if len(n)>2 and n[1] in '#b' else n[0]
 return (int(n[len(base):])+1)*12+NOTES[base]

def synth_song(song):
 rng=random.Random(song['seed'])
 beat=60/song['bpm']; bars=song['bars']; total=bars*4*beat+2.5
 ev=[]
 def note(ch,pitch,t,dur,vel=65):
  if pitch is None:return
  pitch=N(pitch)
  if isinstance(pitch,int) and 0<=pitch<=127:
   vel=max(1,min(127,int(vel)))
   ev.append((max(0,t),1,ch,pitch,vel))
   ev.append((max(0,t+dur),0,ch,pitch,0))
 def chord_notes(root,quality):
  intervals={'maj':[0,4,7],'min':[0,3,7],'sus2':[0,2,7],'maj7':[0,4,7,11]}
  return [root+x for x in intervals[quality]]
 def human(k=0.028):return rng.uniform(-k,k)
 chords=song['chords'];
 # Program per channel mapping: piano(0), strings(1), harp(2), melody(3), plucks(4), bass(5)
 for b in range(bars):
  root,quality=chords[b%len(chords)]; t=b*4*beat; pitches=chord_notes(root,quality)
  # warm wide piano chords
  for idx,pitch in enumerate(pitches):
   note(0,pitch+12,t+max(0,human()),3.65*beat,43+(b%4)*2+int(idx==2)*3)
  # softly swelling string pad
  for pitch in pitches:
   if b%2==0 or song['style']=='east':note(1,pitch+12,t+0.16,3.55*beat,39)
  note(5,root-12,t,3.8*beat,48)
  # alternating harps / guitar broken chords, rising on chorus
  if song['style']=='east': pattern=[(0,0),(0.75,2),(1.5,1),(2.25,2),(3.0,0),(3.5,1)]
  elif song['style']=='celebrate': pattern=[(0,0),(.5,1),(1,2),(1.5,1),(2,0),(2.5,1),(3,2),(3.5,1)]
  else: pattern=[(0,0),(0.75,1),(1.5,2),(2.25,1),(3,0),(3.5,2)]
  for st,idx in pattern:
   note(2,pitches[idx]+24,t+st*beat+human(.012),.45*beat,53+(b%5)*2)
  if song['style']=='celebrate':
   for step in [0,1,2,3]:note(4,pitches[step%3]+24,t+(step+.75)*beat,.18*beat,43)
  if song['style']=='east':
   for step in [.5,1.5,2.5,3.5]:note(4,pitches[1]+12,t+step*beat,.18*beat,36)
 # structured original melodies, in C major/A minor or pentatonic
 phrase=song['melody']; steps=len(phrase)
 for b in range(bars):
  pattern=phrase[b%steps]; t=b*4*beat
  for offset, pitch, length in pattern:
   if pitch is None:continue
   vel=75+(b//8)*2+rng.randint(-6,5)
   note(3,pitch,t+offset*beat+human(.017),length*beat*.91,vel)
 # sparse percussion fills on joyful style (GM drums channel 9 reserved, but use high pluck)
 if song['style']=='celebrate':
  for b in range(bars):
   t=b*4*beat
   for off in (0,1.5,2,3.5): note(4,84,t+off*beat,.12*beat,33)
 ev.sort(key=lambda e:(e[0],e[1])); print(song['file'],len(ev),'events,',round(total,1),'s')
 settings=lib.new_fluid_settings();lib.fluid_settings_setnum(settings,b'synth.sample-rate',SAMPLE_RATE);lib.fluid_settings_setnum(settings,b'synth.gain',0.53)
 lib.fluid_settings_setnum(settings,b'synth.reverb.active',1.0);lib.fluid_settings_setint(settings,b'synth.reverb.active',1)
 lib.fluid_settings_setint(settings,b'synth.chorus.active',1)
 fs=lib.new_fluid_synth(settings)
 assert lib.fluid_synth_sfload(fs,SF.encode(),1)>=0
 programs=song['programs'];
 for ch,pg in enumerate(programs):
  if ch==9:continue
  lib.fluid_synth_program_change(fs,ch,pg)
  lib.fluid_synth_cc(fs,ch,7,85 if ch in (0,3) else 65)
  lib.fluid_synth_cc(fs,ch,10,34 if ch in (1,2) else (92 if ch in (4,5) else 64))
 chunks=[]; last=0
 def write_audio(until):
  nonlocal last
  frames=round(until*SAMPLE_RATE)-last
  if frames<=0:return
  lo=np.zeros(frames,dtype=np.float32);ro=np.zeros(frames,dtype=np.float32)
  lib.fluid_synth_write_float(fs,frames,lo.ctypes.data,0,1,ro.ctypes.data,0,1)
  chunks.append(np.stack((lo,ro),axis=-1));last+=frames
 for t,on,ch,pitch,vel in ev:
  write_audio(t)
  if on:lib.fluid_synth_noteon(fs,ch,pitch,vel)
  else:lib.fluid_synth_noteoff(fs,ch,pitch)
 write_audio(total)
 audio=np.concatenate(chunks)
 # Gentle mastering - remove DC, taper and peak normalize
 audio-=np.mean(audio,axis=0,keepdims=True)
 head=int(.8*SAMPLE_RATE);tail=int(2.2*SAMPLE_RATE)
 audio[:head]*=np.linspace(.08,1,head,dtype=np.float32)[:,None]
 audio[-tail:]*=np.linspace(1,0,tail,dtype=np.float32)[:,None]
 peak=np.max(np.abs(audio));audio*=min(1.5,.88/max(.05,peak))
 a16=np.int16(np.clip(audio,-1,1)*32767)
 temp=tempfile.NamedTemporaryFile(suffix='.wav',delete=False);temp.close()
 with wave.open(temp.name,'wb') as w:w.setframerate(SAMPLE_RATE);w.setnchannels(2);w.setsampwidth(2);w.writeframes(a16.tobytes())
 output=os.path.join(OUT,song['file']);cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-i',temp.name,'-codec:a','libmp3lame','-qscale:a','5','-ar','32000',output]
 subprocess.run(cmd,check=True);os.unlink(temp.name)
 lib.delete_fluid_synth(fs);lib.delete_fluid_settings(settings)
 print('->',os.path.getsize(output)//1024,'KB')

# Each line melody is bar-level set of (beat,pitch,duration); variations form motif and cadence.
# Original melodies written for this demo rather than any commercially published song.
ROMANCE=[[(0,'E5',1.4),(1.5,'G5',.5),(2,'A5',1),(3,'G5',1)],[(0,'D5',1),(1,'E5',1),(2,'G5',1.7)],[(0,'E5',.8),(1,'C5',.8),(2,'D5',.8),(3,'E5',.8)],[(0,'C5',2),(2.5,'D5',.6),(3.2,'C5',.5)],[(0,'E5',1),(1,'G5',1),(2,'C6',1.4)],[(0,'B5',1),(1,'G5',1),(2,'E5',1.5)],[(0,'A5',1.1),(1.4,'G5',.6),(2.25,'F5',.9),(3.25,'E5',.55)],[(0,'D5',1),(1,'C5',2.7)]]
EAST=[[(0,'E5',.75),(1,'G5',.75),(2,'A5',1.6)],[(0,'C6',.8),(1,'A5',.6),(2,'G5',1.6)],[(0,'E5',1),(1.25,'D5',.75),(2.3,'E5',1.5)],[(0,'G5',.9),(1,'E5',.85),(2.2,'D5',1.5)],[(0,'E5',.8),(1,'A5',.8),(2,'C6',1.4)],[(0,'B5',.7),(1,'A5',.75),(2,'G5',1.5)],[(0,'E5',1.2),(1.6,'D5',.8),(2.5,'C5',1)],[(0,'D5',.75),(1.1,'E5',1),(2.3,'C5',1.5)]]
CELEBRATE=[[(0,'G5',.6),(.75,'A5',.6),(1.5,'C6',1.2),(3,'A5',.6)],[(0,'B5',.7),(1,'G5',.65),(2,'E5',1.6)],[(0,'E5',.5),(.75,'G5',.5),(1.5,'A5',.85),(2.6,'C6',1)],[(0,'A5',.65),(1,'G5',.65),(2,'F5',1.45)],[(0,'G5',.5),(.6,'A5',.5),(1.2,'B5',.75),(2.2,'C6',1.5)],[(0,'D6',.8),(1,'C6',.7),(2,'B5',1.2)],[(0,'A5',.8),(1.1,'G5',.8),(2.2,'E5',1.4)],[(0,'G5',.75),(1.1,'E5',.75),(2.2,'C5',1.5)]]
DAWN=[[(0,'C5',1),(1.2,'E5',.7),(2.2,'G5',1.5)],[(0,'E5',1.6),(2,'D5',1.4)],[(0,'A4',1),(1.3,'C5',1.1),(2.6,'E5',1.1)],[(0,'F5',1.1),(1.4,'E5',.8),(2.5,'C5',1.3)],[(0,'G5',1.4),(1.75,'E5',.7),(2.8,'D5',.85)],[(0,'C5',.9),(1.2,'D5',.9),(2.45,'E5',1)],[(0,'F5',1.1),(1.5,'A5',.75),(2.5,'G5',1.2)],[(0,'E5',.75),(1,'D5',.75),(2,'C5',1.9)]]
SONGS=[
 {'file':'loi-hen-tram-nam.mp3','seed':16,'bars':24,'bpm':95,'style':'romance','programs':[0,48,46,73,10,42], 'chords':[(48,'maj'),(55,'maj'),(57,'min'),(53,'maj'),(48,'maj'),(52,'min'),(53,'maj'),(55,'maj')],'melody':ROMANCE},
 {'file':'duyen-ngoc-phuong-dong.mp3','seed':24,'bars':24,'bpm':100,'style':'east','programs':[0,48,107,73,13,42],'chords':[(57,'min'),(53,'maj'),(48,'maj'),(55,'maj'),(57,'min'),(53,'maj'),(55,'maj'),(57,'min')],'melody':EAST},
 {'file':'ngay-vui-chung-doi.mp3','seed':35,'bars':24,'bpm':115,'style':'celebrate','programs':[1,48,25,9,11,32],'chords':[(48,'maj'),(55,'maj'),(57,'min'),(53,'maj'),(48,'maj'),(53,'maj'),(55,'maj'),(48,'maj')],'melody':CELEBRATE},
 {'file':'binh-minh-hanh-phuc.mp3','seed':19,'bars':24,'bpm':85,'style':'romance','programs':[0,48,46,11,10,42],'chords':[(48,'maj'),(52,'min'),(57,'min'),(53,'maj'),(48,'maj'),(55,'maj'),(53,'maj'),(48,'maj')],'melody':DAWN},
]
if __name__=='__main__':
 for song in SONGS:synth_song(song)
