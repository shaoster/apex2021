import { BaseEvent } from "./Event";
import {
  MAX_TURN_COUNT,
} from "./Constants";

export class Schedule {
  eventsByDay:object;

  constructor(eventsByDay: object) {
    this.eventsByDay = eventsByDay || {};
  }

  addEvent(turnNumber: number, eventId: string):void {
    if (!(turnNumber in this.eventsByDay)) {
      this.eventsByDay[turnNumber] = [];
    }
    this.eventsByDay[turnNumber].push(eventId);
  }

  getEvents(turnNumber: number):Array<string> {
    if (turnNumber in this.eventsByDay) {
      return this.eventsByDay[turnNumber]
    }
    return [];
  }
}

export const SchedulePlugin = (options) => {
  const {
    initialSchedule,
    initialEvents,
  } = options;
  return {
    name: "schedule",
    setup: () => ({
      schedule: initialSchedule,
      events: initialEvents,
    }),
    api: ({ctx, data}) => ({
      getCurrentEvents: function():Array<object> {
        return new Schedule(data.schedule)
          .getEvents(ctx.turn)
          .map((eventId)=>({
            id:eventId,
            event: this.getEvent(eventId),
          }));
      },
      addEvent: (turnNumber, eventId) => {
        new Schedule(data.schedule).addEvent(turnNumber, eventId);
      },
      getEvents: function():object {
        // Get the nice re-hydrated version of events.
        const patchedEvents = {}
        for (let id in data.events) {
          patchedEvents[id] = this.getEvent(id);
        }
        return patchedEvents;
      },
      getEvent: (eventId) => ({
        // Re-hydrate functions for use in the Game engine.
        ...BaseEvent,
        ...data.events[eventId]
      }),
      getTurnsUntilNextExam: function():object {
        const s = new Schedule(data.schedule);
        for (let turn = ctx.turn + 1; turn <= MAX_TURN_COUNT; turn++) {
          const events = s.getEvents(turn);
          if (events.some(ev => this.getEvent(ev).studyPointsThreshold > 0)) {
            return turn - ctx.turn;
          }
        }
        return null;
      },
      getStudyThresholdForNextExam: function():object {
        const s = new Schedule(data.schedule);
        const turnsUntilNextExam = this.getTurnsUntilNextExam();
        if (turnsUntilNextExam === null) {
          return null;
        }
        const nextExamTurn = ctx.turn + turnsUntilNextExam;
        const events = s.getEvents(nextExamTurn);
        for (let eventId of events) {
          const event = this.getEvent(eventId);
          if (event.studyPointsThreshold > 0) {
            return event.studyPointsThreshold;
          }
        }
        return null;
      },
      getRaw: () => {
        return data;
      }
    }),
  }
}

export const INITIAL_SCHEDULE = {
    0: ["SummerStart"],
    2: ["SchoolStart"],
};

export default Schedule;
