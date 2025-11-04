import {E,Q} from 'https://aeoq.github.io/AEOQ.mjs'
const main = Q('main');
const Storage = {
    save () {
        localStorage.setItem('rune', JSON.stringify(
            [...main.children].reduce((obj, rune) => rune.dataset.level == 0 ? obj : {...obj, [E(rune).get('--id')]: rune.dataset.level}, {})
        ));
        localStorage.setItem('core', Reinforce.dialog.core.value);
    },
    load () {
        Storage.rune = JSON.parse(localStorage.getItem('rune')) || {};
        Storage.core = localStorage.getItem('core');
    }
}
const Support = {
    els: Q('gc-item[class|=support]'),
    check: Q('#support-check input'),
    list: [5870,7177,7178,62738,79964],
    current: () => parseInt(Q('.support').id),
    rotate: index => Support.els.forEach((figure, i) => figure.id = Support.list.at((index + i - 1) % Support.list.length)),
    event () {
        Support.rotate(0);
        Q('gc-item[class|=support] button', (button, i) => button.onclick = () => {
            let index = Support.list.indexOf(Support.current());
            i === 0 ? index-- : index++;
            Support.rotate(index);
            Support.active = Support.check.checked && Support.current();
            Rune.target.present();
        });
        Support.check.onchange = ev => {
            Support.active = ev.target.checked && Support.current();
            Rune.target.present();
        }
    },
    effect: {
        7178: {buff: 0.05},
        7177: {buff: 0.15},
        5870: {buff: 0.1},
        62738: {warp: 9},
        79964: {protect: true}
    }
}
const Reinforce = {
    dialog: Object.assign(Q('dialog'), {
        rune: E(Q('#rune')),
        desc: Q('p'), 
        core: Q('#core data'),
        stat: Q('output'),
        button: Q('#reinforce')
    }),
    imgs: {
        attempt: Q('#attempt'), success: Q('#success'), fail: Q('#fail'),
        clone: (which, time) => Reinforce.dialog.append(...
            [...Reinforce.imgs[which].content.cloneNode(true).children].map(el => E(el).set({dataset: {time}}))
        )
    },
    event () {
        Reinforce.dialog.button.onclick = () => {
            const time = Date.now();
            Reinforce.dialog.classList.add('attempt');
            Reinforce.imgs.clone('attempt', time);
            Reinforce.timer = setTimeout(() => {
                let result = Rune.target.reinforce();
                Reinforce.imgs.clone(result, time);
                Reinforce.dialog.classList.remove('attempt');
                Storage.save();
            }, 2000);
            setTimeout(() => Q(`[data-time='${time}']`, el => el.remove()), 5000);
        }
    },
    rate (level) {
        let {buff, warp} = Support.effect[Support.active] ?? {};
        if (warp || level <= 2) return 1;
        return Math.min(1, Math.exp((2 - level)/10) * (1 + (buff ?? 0)));
    },
    upgrade (level) {
        let {warp} = Support.effect[Support.active] ?? {};
        return warp ?? level + 1;
    },
    degrade (level) {
        let {protect} = Support.effect[Support.active] ?? {};
        if (protect) return level;
        if (level <= 5) return level - 1;
        if (level <= 8) return 0;
        return false;
    },
    disable (go = true) {
        Reinforce.dialog.button.disabled = Support.check.disabled = go;
        go && (Reinforce.dialog.desc.textContent = '');
    }
}
class Rune {
    constructor(id, count) {
        this.el = E('figure.rune.sprite', 
            E('figcaption', [
                E('i.sprite'), E('i.sprite')
            ]), {
                '--id': id,
                '--item': `url('sprite/${Math.floor(id / 100) * 100}.png')`,
            }
        );
        this.el.rune = this;
        Object.assign(this, {
            level: Storage.rune[id] || 0,
            place: count % 3 == 0 ? 'Weapon' : count % 3 == 1 ? 'Armor' : 'Helm',
            grade: Math.floor(count / 6) == 0 ? 3 : Math.floor(count / 6) == 1 ? 2 : 1,
            stat: count % 3 == 0 ? 'Attack' : 'Defense',
            old: Math.floor(count / 3) % 2 == 1
        });
        this.formula = Rune.stat[this.grade][this.old*1][this.stat];
    }
    get level() { return E(this.el).get('--level'); }
    set level(level) {
        this.el.Q('i:first-of-type').hidden = level < 10;
        this.el.dataset.level = level;
        E(this.el).set({ '--level': level });
    }
    prepare () {
        clearTimeout(Reinforce.timer);
        Reinforce.dialog.rune.set({
            title: `${this.old ? 'Old ' : ''}${Rune.name[this.grade]} Rune`,
            dataset: { level: this.level },
            ...E(this.el).get('--id', '--item'),
        });
        this.present();
        this.check();
        Q('dialog img', img => img.remove());
        Reinforce.dialog.showModal();
    }
    present () {
        E(Reinforce.dialog.stat).set({
            title: this.stat,
            value: Math.round(this.formula(this.level))
        });
        let rate = Math.round(Reinforce.rate(this.level) * 10000) / 100;
        let degrade = rate < 100 ? Reinforce.degrade(this.level) : null;
        Reinforce.dialog.desc.innerHTML = [
            `Success rate: ${rate}%`,
            `Requires: ${(this.level + 1) * this.grade} cores`,
            degrade === false ? 'Rune destroyed when failed.' :
            degrade === 0 ? 'Rune initialized when failed.' :
            degrade && degrade != this.level ? 'Rune level falls when failed.' : '',
        ].join('<br>');
    }
    check = () => Reinforce.disable(this.old && this.level >= 9 || Reinforce.dialog.core.value < (this.level + 1) * this.grade)
    reinforce () {
        let success = Math.random() < Reinforce.rate(this.level);
        let outcome = success ? Reinforce.upgrade(this.level) : Reinforce.degrade(this.level);
        Reinforce.dialog.core.value -= (this.level + 1) * this.grade;
        if (outcome === false) {
            Reinforce.dialog.rune.set({ '--item': 'initial' });
            this.destroy();
        } else {
            Reinforce.dialog.rune.set({dataset: {level: this.level = outcome}});
            this.present();
            this.check();
        }
        return success ? 'success' : 'fail';
    }
    destroy () {
        this.el.classList.add('destroyed');
        Reinforce.disable(true, true);
    }
    static name = [, 'Brave', 'Holy', 'Honor']
    static stat = [, [
        {Attack: l => Math.round(l*l*2/7+l*7/20+2)*2, Defense: l => l*l*3/26+l*4/5+5},
        {Attack: l => Math.round(l*l/4+l*37/100+1)*2, Defense: l => l*l/8+l*3/8+4}
    ], [
        {Attack: l => Math.round(l*l/2+l*2/45+5)*2, Defense: l => l*l/5+l*7/9+20},
        {Attack: l => Math.round(l*l*3/10+l*3/8+3)*2, Defense: l => l*l*19/90+l/4+18}
    ], [
        {Attack: l => Math.round(l*l*3/4+l/2+8)*2, Defense: l => l*l/3+l+35},
        {Attack: l => l*l+l+12, Defense: l => l*l/3+l/12+31}
    ]] 
}
Object.assign(Rune, {
    init () {
        [[5736,5719],[5664,5647],[5808,5791],[5700,5683],[5772,5755],[5844,5827]].forEach(([from, to]) => {
            let count = 0;
            for (let id = from; id >= to; id--)
                main.append(new Rune(id, count++).el);
        });
        Reinforce.dialog.core.value = Storage.core || 9999;
    },
    event () {
        main.onclick = ev => {
            if (!ev.target.matches('.rune')) return;
            Rune.target = ev.target.rune;
            Rune.target.prepare();
        }
    },
});
Storage.load();
Rune.init();
Rune.event(); 
Support.event();
Reinforce.event();
export {Rune,Reinforce}
